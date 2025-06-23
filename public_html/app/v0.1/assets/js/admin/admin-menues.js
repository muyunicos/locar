import { MenuState } from './menues/MenuState.js';
import { MenuView } from './menues/MenuView.js';
import { MenuApiService } from './menues/MenuApiService.js';

(async () => {
    // --- Variables de Estado del Módulo ---
    let hasUnsavedChanges = false;
    let appConfig = {};
    let activeItem = null;          // El elemento del DOM que está activo (.item o .c-container)
    let floatingControls = null;  // El panel de controles flotante
    let openActionPanel = null;     // El sub-panel de opciones
    
    // --- Variables de Estado para Drag & Drop ---
    let placeholder = null;
    let draggedId = null;

    function init() {
        console.log('[LOG] v10: Iniciando Módulo de Menús...');
        const body = document.body;
        const menuContainer = document.getElementById('menu-container');
        floatingControls = document.getElementById('admin-floating-controls');

        if (!menuContainer || !floatingControls) { 
            console.error("FATAL: #menu-container o #admin-floating-controls no encontrado."); 
            return; 
        }
        
        appConfig = { clientId: body.dataset.clientId, publicUrl: body.dataset.publicUrl, clientUrl: body.dataset.clientUrl, devId: body.dataset.devId, initialContext: JSON.parse(menuContainer.dataset.initialJson || '{}'), dataSourceFile: menuContainer.dataset.sourceFile };
        
        MenuApiService.init({ apiBaseUrl: appConfig.publicUrl });
        MenuView.init({ publicUrl: appConfig.publicUrl, clientUrl: appConfig.clientUrl });
        MenuState.load(appConfig.initialContext.menuData || appConfig.initialContext);
        
        MenuView.render(MenuState.getMenu());
        setupEventListeners();
        console.log('[LOG] v10: Módulo inicializado y eventos registrados.');
    }

    function setupEventListeners() {
        const menuContainer = document.getElementById('item-list-container');
        if (!menuContainer) return;
        
        console.log('[LOG] Registrando listeners...');
        // Listener para seleccionar ítems
        menuContainer.addEventListener('click', handleSelection);
        menuContainer.addEventListener('blur', handleTextEdit, true);
        
        // CORRECCIÓN: Listeners para acciones y drag AHORA están en el panel flotante
        floatingControls.addEventListener('click', handleControlsClick);
        floatingControls.addEventListener('dragstart', handleDragStart);
        
        // Listeners globales para el arrastre
        document.addEventListener('dragend', handleDragEnd);
        document.addEventListener('dragover', handleDragOver);
        document.addEventListener('drop', handleDrop);
        
        document.querySelector('#admin-save-fab button')?.addEventListener('click', handleSaveMenu);
        
        // Listener para desactivar/cerrar al hacer clic fuera
        document.addEventListener('click', (e) => {
            const menuList = document.getElementById('item-list-container');
            // Si el clic fue fuera del menú Y fuera de los controles flotantes
            if (activeItem && !menuList.contains(e.target) && !floatingControls.contains(e.target)) {
                deactivateCurrentItem();
            }
            // Si el clic fue fuera del popup de opciones
            if (openActionPanel && !openActionPanel.closest('.item-actions-panel').contains(e.target)) {
                openActionPanel.classList.remove('is-open');
                openActionPanel = null;
            }
        });
        
        window.addEventListener('beforeunload', (e) => { if (hasUnsavedChanges) { e.preventDefault(); e.returnValue = ''; } });
        console.log('[LOG] Listeners registrados correctamente.');
    }

    function deactivateCurrentItem() {
        console.log('[LOG] Desactivando item:', activeItem ? activeItem.dataset.id : 'ninguno');
        if (activeItem) {
            activeItem.classList.remove('is-active-admin-item');
            activeItem.draggable = false;
        }
        floatingControls.classList.remove('visible');
        activeItem = null;
    }

    function activateItem(itemElement) {
        if (activeItem === itemElement) return;
        console.log('[LOG] Intentando activar item:', itemElement.dataset.id);
        deactivateCurrentItem();
        
        activeItem = itemElement;
        activeItem.classList.add('is-active-admin-item');
        
        // Hacemos que el item activo sea arrastrable solo cuando se selecciona
        activeItem.draggable = true; 
        
        positionFloatingControls();
        populateActionPanel();
    }
    
    function positionFloatingControls() {
        if (!activeItem) return;
        const rect = activeItem.getBoundingClientRect();
        const topPosition = rect.top + window.scrollY;
        const leftPosition = rect.left - floatingControls.offsetWidth - 10;
        
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
        // La selección solo ocurre si no se hizo clic en un campo editable o una acción
        if (e.target.isContentEditable || e.target.closest('[data-action]')) {
            return;
        }
        const targetItem = e.target.closest('.item, .c-container');
        if (targetItem) {
            console.log('[LOG] Clic de selección detectado.');
            activateItem(targetItem);
        }
    }
    
    function handleControlsClick(e) {
        const actionTarget = e.target.closest('[data-action]');
        if (!actionTarget || !activeItem) {
            console.log('[LOG] Clic en controles, pero sin acción válida o ítem activo.');
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
                if (confirm('¿Estás seguro?')) { MenuState.deleteItem(id); needsRender = true; }
                break;
            case 'duplicate': MenuState.duplicateItem(id); needsRender = true; break;
            case 'add-item': MenuState.addItem(id, 'item'); needsRender = true; break;
            case 'add-category': MenuState.addItem(id, 'category'); needsRender = true; break;
            case 'toggle-hidden': 
                MenuState.toggleItemVisibility(id); 
                activeItem.classList.toggle('is-admin-hidden');
                setChangesMade();
                return;
        }

        if (needsRender) {
            console.log('[LOG] El estado cambió, se necesita re-renderizar.');
            deactivateCurrentItem();
            MenuView.render(MenuState.getMenu());
            setChangesMade();
        }
    }

    // --- LÓGICA DE DRAG & DROP ---
    function handleDragStart(e) {
        if (!e.target.matches('.item-drag-handle') || !activeItem) {
            console.log('[LOG] dragstart ignorado. No en manija o sin ítem activo.');
            e.preventDefault();
            return;
        }
        
        console.log('[LOG] dragstart INICIADO para el ID:', activeItem.dataset.id);
        draggedId = activeItem.dataset.id;
        e.dataTransfer.setData('text/plain', draggedId);
        e.dataTransfer.effectAllowed = 'move';
        
        placeholder = document.createElement('div');
        placeholder.className = 'drop-placeholder';
        placeholder.style.height = `${activeItem.offsetHeight}px`;

        setTimeout(() => activeItem.classList.add('is-dragging'), 0);
    }
    
    // ... (El resto de funciones siguen igual, las he omitido por brevedad pero deben estar en tu archivo) ...
    function handleDragOver(e) { /*...*/ }
    function handleDrop(e) { /*...*/ }
    function handleDragEnd(e) { /*...*/ }
    function handleTextEdit(e) { /*...*/ }
    async function handleSaveMenu() { /*...*/ }
    function setChangesMade() { /*...*/ }


    function handleDragOver(e) {
        e.preventDefault();
        const targetItem = e.target.closest('.item, .c-container');
        if (!targetItem || targetItem === activeItem) return;

        const rect = targetItem.getBoundingClientRect();
        const after = e.clientY >= (rect.top + rect.height / 2);

        if (after) {
            targetItem.parentNode.insertBefore(placeholder, targetItem.nextSibling);
        } else {
            targetItem.parentNode.insertBefore(placeholder, targetItem);
        }
    }

    function handleDrop(e) {
        e.preventDefault();
        if (!placeholder || !placeholder.parentNode) return;
        
        const parentList = placeholder.parentNode;
        const parentCategory = parentList.closest('.c-container[data-type="category"]');
        const newParentId = parentCategory ? parentCategory.dataset.id : null;
        const newIndex = Array.from(parentList.children).indexOf(placeholder);

        const success = MenuState.reorderItem(draggedId, newParentId, newIndex);
        if(success) setChangesMade();
    }

    function handleDragEnd(e) {
        if(activeItem) activeItem.classList.remove('is-dragging');
        if (placeholder && placeholder.parentNode) {
            placeholder.parentNode.removeChild(placeholder);
        }
        draggedId = null;
        placeholder = null;
        deactivateCurrentItem();
        MenuView.render(MenuState.getMenu());
    }


    async function handleSaveMenu() { const saveButton = document.querySelector('#admin-save-fab button'); saveButton.disabled = true; saveButton.innerHTML = '💾'; saveButton.style.cursor = 'wait'; try { const payload = { menuData: MenuState.getMenu(), dataSource: appConfig.dataSourceFile, client: appConfig.clientId, url: appConfig.clientUrl, dev: appConfig.devId }; const response = await MenuApiService.saveMenu(payload); if (response.success) { hasUnsavedChanges = false; MenuView.setSaveChangesVisible(false); alert('¡Guardado!'); } else { throw new Error(response.message || 'Error del servidor.'); } } catch (error) { console.error('Fallo al guardar:', error); alert(`Error: ${error.message}`); } finally { saveButton.disabled = false; saveButton.style.cursor = 'pointer';} }
    function handleTextEdit(e) { const target = e.target; if (!target.isContentEditable) return; const wrapperElement = target.closest('.admin-item-wrapper'); const property = target.dataset.property; if (!wrapperElement || !property) return; const id = wrapperElement.dataset.id; const newValue = target.textContent; MenuState.updateItemProperty(id, property, newValue); setChangesMade(); }
function setChangesMade() { if (!hasUnsavedChanges) { hasUnsavedChanges = true; MenuView.setSaveChangesVisible(true); } }
    document.addEventListener('DOMContentLoaded', init);
})();