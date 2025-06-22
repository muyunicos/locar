import { MenuState } from './menues/MenuState.js';
import { MenuView } from './menues/MenuView.js';
import { MenuApiService } from './menues/MenuApiService.js';

(async () => {
    // ... (las variables de estado no cambian)
    let hasUnsavedChanges = false;
    let appConfig = {};
    let openActionPanel = null;
    let activeItemWrapper = null;

    function init() {
        // ... (la función init no cambia)
        const body = document.body;
        const menuContainer = document.getElementById('menu-container');
        if (!menuContainer) { console.error("El contenedor principal del módulo #menu-container no fue encontrado."); return; }
        appConfig = { clientId: body.dataset.clientId, publicUrl: body.dataset.publicUrl, clientUrl: body.dataset.clientUrl, devId: body.dataset.devId, initialContext: JSON.parse(menuContainer.dataset.initialJson || '{}'), dataSourceFile: menuContainer.dataset.sourceFile };
        MenuApiService.init({ apiBaseUrl: appConfig.publicUrl });
        MenuView.init({ publicUrl: appConfig.publicUrl, clientUrl: appConfig.clientUrl });
        MenuState.load(appConfig.initialContext.menuData || appConfig.initialContext);
        MenuView.render(MenuState.getMenu());
        setupEventListeners();
        console.log('Controlador de Menús inicializado con modelo "Click-to-Activate" y Drag&Drop.');
    }

    function setupEventListeners() {
        const menuItemsContainer = document.getElementById('item-list-container');
        if (!menuItemsContainer) return;

        // Eventos de Clic y Edición
        menuItemsContainer.addEventListener('click', handleContainerClick);
        menuItemsContainer.addEventListener('blur', handleTextEdit, true);

        // --- NUEVO: Eventos para Drag and Drop ---
        menuItemsContainer.addEventListener('dragstart', handleDragStart);
        menuItemsContainer.addEventListener('dragover', handleDragOver);
        menuItemsContainer.addEventListener('dragleave', handleDragLeave);
        menuItemsContainer.addEventListener('drop', handleDrop);
        menuItemsContainer.addEventListener('dragend', handleDragEnd); // Para limpiar

        // ... (el resto de listeners no cambian)
        const saveButton = document.getElementById('fab-save-menu');
        if (saveButton) saveButton.addEventListener('click', handleSaveMenu);
        document.addEventListener('click', (e) => {
            if (openActionPanel && !openActionPanel.contains(e.target)) { openActionPanel.classList.remove('is-open'); openActionPanel = null; }
            if (activeItemWrapper && !menuItemsContainer.contains(e.target)) { activeItemWrapper.classList.remove('is-active-admin-item'); activeItemWrapper = null; }
        });
        window.addEventListener('beforeunload', (e) => {
            if (hasUnsavedChanges) { e.preventDefault(); e.returnValue = ''; }
        });
    }

    // --- NUEVAS FUNCIONES PARA MANEJAR DRAG & DROP ---

    function handleDragStart(e) {
        const wrapper = e.target.closest('.admin-item-wrapper');
        if (!wrapper) return;
        // Guardamos el ID del elemento arrastrado
        e.dataTransfer.setData('text/plain', wrapper.dataset.id);
        e.dataTransfer.effectAllowed = 'move';
        // Añadimos un pequeño delay para que el navegador "capture" la imagen del elemento antes de aplicar el estilo.
        setTimeout(() => {
            wrapper.classList.add('is-dragging');
        }, 0);
    }

    function handleDragOver(e) {
        e.preventDefault(); // ¡Esencial para que el evento 'drop' funcione!
        const targetWrapper = e.target.closest('.admin-item-wrapper');
        if (!targetWrapper) return;

        // Limpiamos indicadores anteriores
        clearDropTargets();

        // Calculamos si el cursor está en la mitad superior o inferior del elemento
        const rect = targetWrapper.getBoundingClientRect();
        const midpoint = rect.top + (rect.height / 2);

        if (e.clientY < midpoint) {
            targetWrapper.classList.add('drop-target-top');
        } else {
            targetWrapper.classList.add('drop-target-bottom');
        }
    }

    function handleDragLeave(e) {
        const targetWrapper = e.target.closest('.admin-item-wrapper');
        if (targetWrapper) {
            targetWrapper.classList.remove('drop-target-top', 'drop-target-bottom');
        }
    }

    function handleDrop(e) {
        e.preventDefault();
        const draggedId = e.dataTransfer.getData('text/plain');
        const targetWrapper = e.target.closest('.admin-item-wrapper');

        if (!targetWrapper || !draggedId) {
            clearDropTargets();
            return;
        }

        const position = targetWrapper.classList.contains('drop-target-top') ? 'top' : 'bottom';
        const targetId = targetWrapper.dataset.id;
        
        clearDropTargets();

        // Llamamos al cerebro para que haga la lógica de reordenar
        const success = MenuState.reorderItem(draggedId, targetId, position);
        
        if (success) {
            // Si la lógica funcionó, actualizamos la vista y marcamos cambios
            MenuView.render(MenuState.getMenu());
            setChangesMade();
        }
    }
    
    function handleDragEnd(e) {
        // Limpieza final por si el drop ocurre fuera de un target válido
        const draggedElement = document.querySelector('.is-dragging');
        if (draggedElement) {
            draggedElement.classList.remove('is-dragging');
        }
        clearDropTargets();
    }
    
    function clearDropTargets() {
        document.querySelectorAll('.drop-target-top, .drop-target-bottom').forEach(el => {
            el.classList.remove('drop-target-top', 'drop-target-bottom');
        });
    }

    // ... (El resto de funciones: handleContainerClick, handleItemAction, handleItemSelection, etc. no cambian)
    function handleContainerClick(e) { const actionTarget = e.target.closest('[data-action]'); if (actionTarget) { handleItemAction(e, actionTarget); } else { handleItemSelection(e); } }
    function handleItemAction(e, actionTarget) { const action = actionTarget.dataset.action; const wrapperElement = e.target.closest('.admin-item-wrapper'); const id = wrapperElement?.dataset.id; if (action === 'toggle-options') { const panel = actionTarget.closest('.item-actions-panel'); if (openActionPanel && openActionPanel !== panel) { openActionPanel.classList.remove('is-open'); } panel.classList.toggle('is-open'); openActionPanel = panel.classList.contains('is-open') ? panel : null; e.stopPropagation(); return; } let needsRender = false; switch (action) { case 'delete': if (confirm('¿Estás seguro de que quieres eliminar este elemento?')) { MenuState.deleteItem(id); needsRender = true; } break; case 'duplicate': MenuState.duplicateItem(id); needsRender = true; break; case 'add-item': MenuState.addItem(id, 'item'); needsRender = true; break; case 'add-category': MenuState.addItem(id, 'category'); needsRender = true; break; case 'toggle-hidden': MenuState.toggleItemVisibility(id); MenuView.toggleItemVisibility(id); setChangesMade(); return; } if (needsRender) { MenuView.render(MenuState.getMenu()); setChangesMade(); } }
    function handleItemSelection(e) { const clickedWrapper = e.target.closest('.admin-item-wrapper'); if (!clickedWrapper) { if (activeItemWrapper) { activeItemWrapper.classList.remove('is-active-admin-item'); activeItemWrapper = null; } return; }; if (clickedWrapper === activeItemWrapper) { return; } if (activeItemWrapper) { activeItemWrapper.classList.remove('is-active-admin-item'); } clickedWrapper.classList.add('is-active-admin-item'); activeItemWrapper = clickedWrapper; }
    function setChangesMade() { if (!hasUnsavedChanges) { hasUnsavedChanges = true; MenuView.setSaveChangesVisible(true); } }
    async function handleSaveMenu() { const saveButton = document.getElementById('fab-save-menu'); saveButton.classList.add('is-loading'); try { const payload = { menuData: MenuState.getMenu(), dataSource: appConfig.dataSourceFile, client: appConfig.clientId, url: appConfig.clientUrl, dev: appConfig.devId }; const response = await MenuApiService.saveMenu(payload); if (response.success) { hasUnsavedChanges = false; MenuView.setSaveChangesVisible(false); alert('¡Menú guardado con éxito!'); } else { throw new Error(response.message || 'El servidor devolvió un error.'); } } catch (error) { console.error('Fallo al guardar el menú:', error); alert(`Error al guardar: ${error.message}`); } finally { saveButton.classList.remove('is-loading'); } }
    function handleTextEdit(e) { const target = e.target; if (!target.isContentEditable) return; const wrapperElement = target.closest('.admin-item-wrapper'); const property = target.dataset.property; if (!wrapperElement || !property) return; const id = wrapperElement.dataset.id; const newValue = target.textContent; MenuState.updateItemProperty(id, property, newValue); setChangesMade(); }


    document.addEventListener('DOMContentLoaded', init);
})();