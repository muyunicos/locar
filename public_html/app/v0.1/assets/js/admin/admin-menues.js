import { MenuState } from './menues/MenuState.js';
import { MenuView } from './menues/MenuView.js';
import { MenuApiService } from './menues/MenuApiService.js';

(async () => {
    let hasUnsavedChanges = false;
    let appConfig = {};
    let openActionPanel = null;
    let activeItemWrapper = null;
    let draggedElement = null;
    let placeholder = null;

    function init() {
        const body = document.body;
        const menuContainer = document.getElementById('menu-container');
        if (!menuContainer) { console.error("El contenedor del módulo #menu-container no fue encontrado."); return; }
        appConfig = { clientId: body.dataset.clientId, publicUrl: body.dataset.publicUrl, clientUrl: body.dataset.clientUrl, devId: body.dataset.devId, initialContext: JSON.parse(menuContainer.dataset.initialJson || '{}'), dataSourceFile: menuContainer.dataset.sourceFile };
        MenuApiService.init({ apiBaseUrl: appConfig.publicUrl });
        MenuView.init({ publicUrl: appConfig.publicUrl, clientUrl: appConfig.clientUrl });
        MenuState.load(appConfig.initialContext.menuData || appConfig.initialContext);
        MenuView.render(MenuState.getMenu());
        setupEventListeners();
        console.log('Controlador de Menús inicializado con Drag&Drop v5 (Estable).');
    }

    function setupEventListeners() {
        const menuItemsContainer = document.getElementById('item-list-container');
        if (!menuItemsContainer) return;
        menuItemsContainer.addEventListener('click', handleContainerClick);
        menuItemsContainer.addEventListener('blur', handleTextEdit, true);
        menuItemsContainer.addEventListener('dragstart', handleDragStart);
        menuItemsContainer.addEventListener('dragend', handleDragEnd);
        menuItemsContainer.addEventListener('dragover', handleDragOver);
        menuItemsContainer.addEventListener('drop', handleDrop);
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

    // --- LÓGICA DE DRAG & DROP v5 (ESTABLE) ---

    function handleDragStart(e) {
        if (!e.target.matches('.item-drag-handle')) {
            e.preventDefault();
            return;
        }
        draggedElement = e.target.closest('.admin-item-wrapper');
        e.dataTransfer.setData('text/plain', draggedElement.dataset.id);
        e.dataTransfer.effectAllowed = 'move';
        
        // CORRECCIÓN 1: Seleccionar la imagen fantasma correcta.
        const isCategory = draggedElement.dataset.type === 'category';
        const dragImage = isCategory 
            ? draggedElement.querySelector('.c-titulo') 
            : draggedElement.querySelector('.item');
        e.dataTransfer.setDragImage(dragImage, 20, 20);

        // Crear placeholder.
        placeholder = document.createElement('div');
        placeholder.className = 'drop-placeholder';
        // La altura se calcula una sola vez para evitar problemas de layout.
        placeholder.style.height = `${draggedElement.offsetHeight}px`;

        // Usar opacity en lugar de display:none para evitar el "salto" de layout.
        setTimeout(() => {
            draggedElement.classList.add('is-drag-source');
            if (isCategory) {
                draggedElement.classList.add('is-collapsed-drag');
            }
        }, 0);
    }

    function handleDragOver(e) {
        e.preventDefault();
        
        const targetWrapper = e.target.closest('.admin-item-wrapper');
        
        // No hacer nada si estamos sobre el placeholder o fuera de un wrapper válido.
        if (e.target.matches('.drop-placeholder') || !targetWrapper || targetWrapper === draggedElement) {
            return;
        }

        const rect = targetWrapper.getBoundingClientRect();
        const midpoint = rect.top + rect.height / 2;
        const after = e.clientY >= midpoint;

        // Anti-parpadeo: Solo movemos el placeholder si es estrictamente necesario.
        if (after) {
            if (targetWrapper.nextSibling !== placeholder) {
                targetWrapper.parentNode.insertBefore(placeholder, targetWrapper.nextSibling);
            }
        } else {
            if (targetWrapper.previousSibling !== placeholder) {
                targetWrapper.parentNode.insertBefore(placeholder, targetWrapper);
            }
        }
    }

    function handleDrop(e) {
        e.preventDefault();
        // CORRECCIÓN 3: Asegurarse de que el drop es válido y la lógica es robusta.
        if (!placeholder || !placeholder.parentNode) {
            return; // El drop no ocurrió en un lugar válido donde se pudo poner el placeholder.
        }

        const draggedId = e.dataTransfer.getData('text/plain');
        if (!draggedId) return;

        // --- Lógica de Destino Fiable ---
        const parentElement = placeholder.parentNode;
        const parentWrapper = parentElement.closest('.admin-item-wrapper');
        const newParentId = parentWrapper ? parentWrapper.dataset.id : null;
        
        // El índice final es la posición del placeholder en la lista de elementos del DOM.
        const newIndex = Array.from(parentElement.children).indexOf(placeholder);

        const success = MenuState.reorderItem(draggedId, newParentId, newIndex);
        
        if (success) {
            setChangesMade();
        }
    }
    
    function handleDragEnd(e) {
        // Limpieza final, siempre se ejecuta.
        if (draggedElement) {
            draggedElement.classList.remove('is-drag-source', 'is-collapsed-drag');
        }
        if (placeholder && placeholder.parentNode) {
            placeholder.parentNode.removeChild(placeholder);
        }
        draggedElement = null;
        placeholder = null;

        // El renderizado final asegura la consistencia visual.
        MenuView.render(MenuState.getMenu());
    }
    
    // --- El resto de funciones no tienen cambios ---
    function handleContainerClick(e) { const actionTarget = e.target.closest('[data-action]'); if (actionTarget) { handleItemAction(e, actionTarget); } else { handleItemSelection(e); } }
    function handleItemAction(e, actionTarget) { const action = actionTarget.dataset.action; const wrapperElement = e.target.closest('.admin-item-wrapper'); const id = wrapperElement?.dataset.id; if (action === 'toggle-options') { const panel = actionTarget.closest('.item-actions-panel'); if (openActionPanel && openActionPanel !== panel) { openActionPanel.classList.remove('is-open'); } panel.classList.toggle('is-open'); openActionPanel = panel.classList.contains('is-open') ? panel : null; e.stopPropagation(); return; } let needsRender = false; switch (action) { case 'delete': if (confirm('¿Estás seguro de que quieres eliminar este elemento?')) { MenuState.deleteItem(id); needsRender = true; } break; case 'duplicate': MenuState.duplicateItem(id); needsRender = true; break; case 'add-item': MenuState.addItem(id, 'item'); needsRender = true; break; case 'add-category': MenuState.addItem(id, 'category'); needsRender = true; break; case 'toggle-hidden': MenuState.toggleItemVisibility(id); MenuView.toggleItemVisibility(id); setChangesMade(); return; } if (needsRender) { MenuView.render(MenuState.getMenu()); setChangesMade(); } }
    function handleItemSelection(e) { const clickedWrapper = e.target.closest('.admin-item-wrapper'); if (!clickedWrapper) { if (activeItemWrapper) { activeItemWrapper.classList.remove('is-active-admin-item'); activeItemWrapper = null; } return; }; if (clickedWrapper === activeItemWrapper) { return; } if (activeItemWrapper) { activeItemWrapper.classList.remove('is-active-admin-item'); } clickedWrapper.classList.add('is-active-admin-item'); activeItemWrapper = clickedWrapper; }
    function setChangesMade() { if (!hasUnsavedChanges) { hasUnsavedChanges = true; MenuView.setSaveChangesVisible(true); } }
    async function handleSaveMenu() { const saveButton = document.getElementById('fab-save-menu'); saveButton.classList.add('is-loading'); try { const payload = { menuData: MenuState.getMenu(), dataSource: appConfig.dataSourceFile, client: appConfig.clientId, url: appConfig.clientUrl, dev: appConfig.devId }; const response = await MenuApiService.saveMenu(payload); if (response.success) { hasUnsavedChanges = false; MenuView.setSaveChangesVisible(false); alert('¡Menú guardado con éxito!'); } else { throw new Error(response.message || 'El servidor devolvió un error.'); } } catch (error) { console.error('Fallo al guardar el menú:', error); alert(`Error al guardar: ${error.message}`); } finally { saveButton.classList.remove('is-loading'); } }
    function handleTextEdit(e) { const target = e.target; if (!target.isContentEditable) return; const wrapperElement = target.closest('.admin-item-wrapper'); const property = target.dataset.property; if (!wrapperElement || !property) return; const id = wrapperElement.dataset.id; const newValue = target.textContent; MenuState.updateItemProperty(id, property, newValue); setChangesMade(); }

    document.addEventListener('DOMContentLoaded', init);
})();