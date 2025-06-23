import { MenuState } from './menues/MenuState.js';
import { MenuView } from './menues/MenuView.js';
import { MenuApiService } from './menues/MenuApiService.js';
import { DragDropManager } from './menues/DragDropManager.js';

(async () => {
    let hasUnsavedChanges = false;
    let appConfig = {};
    let activeItem = null;
    let floatingControls = null;
    let openActionPanel = null;

    function init() {
        console.log('[LOG] v10: Iniciando Módulo de Menús...');
        const body = document.body;
        const menuContainer = document.getElementById('menu-container');
        floatingControls = document.getElementById('admin-floating-controls');
        const saveButtonFab = document.getElementById('admin-save-fab'); 
        const itemListContainer = document.getElementById('item-list-container');

        if (!menuContainer || !floatingControls || !saveButtonFab || !itemListContainer) { 
            console.error("FATAL: #menu-container, #admin-floating-controls, #admin-save-fab o #item-list-container no encontrado."); 
            return; 
        }
        
        appConfig = { 
            clientId: body.dataset.clientId, 
            publicUrl: body.dataset.publicUrl, 
            clientUrl: body.dataset.clientUrl, 
            devId: body.dataset.devId, 
            initialContext: JSON.parse(menuContainer.dataset.initialJson || '{}'), 
            dataSourceFile: menuContainer.dataset.dataSourceFile 
        };
        
        MenuApiService.init({ apiBaseUrl: appConfig.publicUrl });
        MenuView.init({ 
            publicUrl: appConfig.publicUrl, 
            clientUrl: appConfig.clientUrl, 
            saveButtonFab: saveButtonFab 
        });
        
        MenuState.load(appConfig.initialContext); 
        
        MenuView.render(MenuState.getMenu());

        DragDropManager.init({
            menuState: MenuState,
            menuView: MenuView,
            mainContainer: itemListContainer,
            deactivateCurrentItemCallback: {
                getActiveItem: () => activeItem,
                deactivate: deactivateCurrentItem,
                setChangesMade: setChangesMade
            }
        });

        setupEventListeners();
        console.log('[LOG] v10: Módulo inicializado y eventos registrados.');
    }

    function setupEventListeners() {
        const menuContainer = document.getElementById('item-list-container'); 
        if (!menuContainer) return;
        
        console.log('[LOG] Registrando listeners...');
        menuContainer.addEventListener('click', handleSelection); 
        menuContainer.addEventListener('input', handleTextEdit, true); 

        menuContainer.addEventListener('click', handlePriceEditClick); 
        
        floatingControls.addEventListener('click', handleControlsClick); 

        
        document.querySelector('#admin-save-fab button')?.addEventListener('click', handleSaveMenu); 
        

        document.addEventListener('click', (e) => {
            if (DragDropManager.isDragging()) {
                return;
            }

            const menuList = document.getElementById('item-list-container'); 
            if (activeItem && 
                !menuList.contains(e.target) && 
                !floatingControls.contains(e.target) &&
                !e.target.isContentEditable && 
                !e.target.closest('[data-action]') &&
                !e.target.closest('.item-drag-handle')) 
            {
                deactivateCurrentItem();
            }
            if (openActionPanel && !openActionPanel.closest('.item-actions-panel').contains(e.target)) { 
                openActionPanel.classList.remove('is-open'); 
                openActionPanel = null; 
            }
        });
        
        window.addEventListener('beforeunload', (e) => { if (hasUnsavedChanges) { e.preventDefault(); e.returnValue = ''; } }); 
        window.addEventListener('resize', positionFloatingControls); 
        window.addEventListener('scroll', positionFloatingControls, true); 
        console.log('[LOG] Listeners registrados correctamente.');
    }

    function deactivateCurrentItem() {
        console.log('[LOG] Desactivando item:', activeItem ? activeItem.dataset.id : 'ninguno'); 
        if (activeItem) { 
            activeItem.classList.remove('is-active-admin-item');
        }
        floatingControls.classList.remove('visible'); 
        activeItem = null; 
        if (openActionPanel) { 
            openActionPanel.classList.remove('is-open'); 
            openActionPanel = null; 
        }
    }

    function activateItem(itemElement) {
        if (activeItem === itemElement) return; 
        console.log('[LOG] Intentando activar item:', itemElement.dataset.id); 
        deactivateCurrentItem(); 
        
        activeItem = itemElement; 
        activeItem.classList.add('is-active-admin-item');
        
        positionFloatingControls(); 
        populateActionPanel(); 
    }
    
    function positionFloatingControls() {
        if (!activeItem || !floatingControls) return; 
        const rect = activeItem.getBoundingClientRect(); 
        const topPosition = rect.top + window.scrollY; 
        let leftPosition = rect.left - floatingControls.offsetWidth - 10; 

        if (leftPosition < 0) { 
            leftPosition = rect.right + 10; 
            if (leftPosition + floatingControls.offsetWidth > window.innerWidth) { 
                leftPosition = (window.innerWidth - floatingControls.offsetWidth) / 2; 
            }
        }
        
        floatingControls.style.top = `${topPosition}px`; 
        floatingControls.style.left = `${leftPosition}px`; 
        floatingControls.classList.add('visible'); 
        console.log(`[LOG] Posicionando controles en {top: ${topPosition}, left: ${leftPosition}}`); 
    }

    function populateActionPanel() {
        if (!activeItem) return; 
        const itemType = activeItem.dataset.type; 
        const popup = floatingControls.querySelector('.options-popup'); 
        let buttonsHtml = `
            <button data-action="toggle-hidden">👁️ Ocultar/Mostrar</button>
            <button data-action="duplicate">📄 Duplicar</button>
        `;
        if (itemType === 'item') { 
             buttonsHtml += `<button data-action="edit-price-action">💲 Editar Precio</button>`; 
        }
        if (itemType === 'category') { 
            buttonsHtml += `
                <button data-action="add-item">➕ Añadir Ítem</button>
                <button data-action="add-category">➕ Añadir Categoría</button>
            `;
        }
        buttonsHtml += `<button data-action="delete" class="danger">🗑️ Eliminar</button>`; 
        popup.innerHTML = buttonsHtml; 
        console.log(`[LOG] Poblando panel de acciones para tipo: ${itemType}`); 
    }

    function handleSelection(e) {
        if (e.target.closest('.item-drag-handle')) { 
            console.log('[LOG] Clic en manija de arrastre, ignorando handleSelection (inicio de posible drag).');
            return;
        }
        if (e.target.isContentEditable || e.target.closest('[data-action]')) { 
            return;
        }
        const targetItem = e.target.closest('.item, .c-container'); 
        if (targetItem) { 
            console.log('[LOG] Clic de selección detectado.'); 
            activateItem(targetItem); 
        }
    }

    function handleTextEdit(e) { 
        const target = e.target; 
        if (!target.isContentEditable || !target.dataset.property) { 
            return; 
        }
        const id = activeItem ? activeItem.dataset.id : null; 
        const property = target.dataset.property; 
        const newValue = target.textContent; 

        if (id && property) { 
            console.log(`[LOG] Editando texto: ID=${id}, Propiedad=${property}, Valor=${newValue}`); 
            MenuState.updateItemProperty(id, property, newValue); 
            setChangesMade(); 
        }
    }
    
    function handleControlsClick(e) {
        const actionTarget = e.target.closest('[data-action]'); 
        if (e.target.closest('.item-drag-handle') || !actionTarget || !activeItem) { 
            console.log('[LOG] Clic en controles, pero sin acción válida o ítem activo / en manija de arrastre.');
            return;
        };

        const action = actionTarget.dataset.action; 
        const id = activeItem.dataset.id; 
        console.log(`[LOG] Acción "${action}" detectada para el ítem activo ID: ${id}`); 
        
        if (action === 'toggle-options') { 
            const panel = actionTarget.closest('.item-actions-panel'); 
            panel.classList.toggle('is-open'); 
            openActionPanel = panel.classList.contains('is-open') ? panel : null; 
            e.stopPropagation(); 
            return;
        }

        let needsRender = false;
        switch (action) {
            case 'delete': 
                if (confirm('¿Estás seguro? Esta acción no se puede deshacer.')) { 
                    MenuState.deleteItem(id); 
                    needsRender = true; 
                    deactivateCurrentItem(); 
                }
                break;
            case 'duplicate': 
                MenuState.duplicateItem(id); 
                needsRender = true; 
                break;
            case 'add-item': 
                MenuState.addItem(id, 'item'); 
                needsRender = true; 
                break;
            case 'add-category': 
                MenuState.addItem(id, 'category'); 
                needsRender = true; 
                break;
            case 'toggle-hidden': 
                MenuState.toggleItemVisibility(id); 
                activeItem.classList.toggle('is-admin-hidden');
                setChangesMade(); 
                return; 
            case 'edit-price-action': 
                handlePriceEditModal(activeItem); 
                return; 
        }

        if (needsRender) { 
            console.log('[LOG] El estado cambió, se necesita re-renderizar.'); 
            deactivateCurrentItem(); 
            MenuView.render(MenuState.getMenu()); 
            setChangesMade(); 
        }
        if (openActionPanel) { 
            openActionPanel.classList.remove('is-open'); 
            openActionPanel = null; 
        }
    }

    function handlePriceEditModal(itemElement) {
        const itemPriceElement = itemElement.querySelector('.item-price'); 
        const currentPrice = itemPriceElement ? parseFloat(itemPriceElement.dataset.price) : 0; 
        
        const newPrice = prompt('Introduce el nuevo precio:', currentPrice.toString()); 
        
        if (newPrice !== null) { 
            const numericPrice = parseFloat(newPrice); 
            if (!isNaN(numericPrice) && numericPrice >= 0) { 
                MenuState.updateItemProperty(itemElement.dataset.id, 'precio', numericPrice); 
                MenuView.render(MenuState.getMenu()); 
                setChangesMade(); 
            } else {
                alert('Precio inválido. Por favor, introduce un número válido.'); 
            }
        }
    }

    function handlePriceEditClick(e) {
        const target = e.target;
        if (target.dataset.action === 'edit-price-action' && activeItem) {
            handlePriceEditModal(activeItem); 
            e.stopPropagation(); 
        } else if (target.classList.contains('item-price') && activeItem && activeItem.contains(target)) {
            handlePriceEditModal(activeItem);
            e.stopPropagation();
        }
    }
    
    function setChangesMade() { 
        if (!hasUnsavedChanges) { 
            hasUnsavedChanges = true; 
            MenuView.setSaveChangesVisible(true); 
            console.log('[LOG] Cambios detectados. Botón de guardar visible.'); 
        } 
    }

    async function handleSaveMenu() { 
        const saveButton = document.querySelector('#admin-save-fab button'); 
        saveButton.disabled = true; 
        saveButton.innerHTML = 'Guardando...'; 
        saveButton.style.cursor = 'wait'; 
        try { 
            const payload = { 
                menuData: MenuState.getMenu(), 
                dataSource: appConfig.dataSourceFile, 
                client: appConfig.clientId, 
                url: appConfig.clientUrl, 
                dev: appConfig.devId 
            }; 
            const response = await MenuApiService.saveMenu(payload); 
            if (response.success) { 
                hasUnsavedChanges = false; 
                MenuView.setSaveChangesVisible(false); 
                alert('¡Menú guardado exitosamente!'); 
                console.log('[LOG] Menú guardado con éxito.'); 
            } else { 
                throw new Error(response.message || 'Error del servidor.'); 
            } 
        } catch (error) { 
            console.error('Fallo al guardar:', error); 
            alert(`Error al guardar el menú: ${error.message}`); 
        } finally { 
            saveButton.disabled = false; 
            saveButton.innerHTML = '💾 Guardar'; 
            saveButton.style.cursor = 'pointer'; 
        } 
    }

    window.adminModuleInitializers = window.adminModuleInitializers || {}; 
    window.adminModuleInitializers.menues = init; 

    if (document.readyState === 'complete' || document.readyState === 'interactive') { 
        init(); 
    } else {
        document.addEventListener('DOMContentLoaded', init); 
    }
})();