import MenuState from './menues/MenuState.js';
import MenuView from './menues/MenuView.js';
import MenuApiService from './menues/MenuApiService.js';
import DragDropManager from './menues/DragDropManager.js';

(function() {
    let appConfig = {};
    let activeItem = null;
    let hasChanges = false;
    let isSaving = false;
    let menuContainer, floatingControls, saveFab, itemListContainer;

    function init(moduleElement) {
        menuContainer = moduleElement;
        if (!menuContainer) {
             console.error("Error crítico: La función init del editor de menús fue llamada sin un elemento de módulo.");
             return;
        }

        floatingControls = menuContainer.querySelector('.admin-floating-controls');
        saveFab = menuContainer.querySelector('.admin-save-fab');
        itemListContainer = menuContainer.querySelector('#item-list-container');

        if (!floatingControls || !saveFab || !itemListContainer) {
            console.error("Faltan elementos esenciales del DOM para el editor de menús.");
            return;
        }
        
        appConfig = {
            config: window.locarConfig || {}, 
            dataSource: menuContainer.dataset.sourceFile,
            initialData: JSON.parse(menuContainer.dataset.initialJson || '{}'),
        };

        MenuState.load(appConfig.initialData);
        MenuView.init(menuContainer); 
        MenuApiService.init({});
        DragDropManager.init({
            onDragEnd: () => {
                setChangesMade(true);
                renderMenu();
            }
        });

        setupEventListeners();
        renderMenu();
    }

    function setupEventListeners() {
        menuContainer.addEventListener('input', handleContentEdit);
        itemListContainer.addEventListener('click', handleSelection);
        floatingControls.addEventListener('click', handleControlsClick);
        saveFab.addEventListener('click', handleSaveMenu);
        document.addEventListener('click', handleDocumentClick);
    }
    
    function renderMenu() {
        const activeId = activeItem ? activeItem.dataset.id : null;
        MenuView.render(MenuState.getMenu());
        if (activeId) {
            const newActiveElement = menuContainer.querySelector(`[data-id="${activeId}"]`);
            if (newActiveElement) {
                activateItem(newActiveElement, false);
            }
        }
    }

    function setChangesMade(state) {
        hasChanges = state;
        saveFab.classList.toggle('visible', hasChanges);
    }

    function handleSelection(e) {
        if (e.target.isContentEditable || e.target.closest('.item-drag-handle')) return;
        const targetItem = e.target.closest('.item, .c-container');
        if (targetItem) activateItem(targetItem);
    }

    function handleContentEdit(e) {
        const target = e.target;
        setChangesMade(true);
        const menuProperty = target.dataset.editableMenuProperty;
        if (menuProperty) {
            MenuState.updateMenuProperty(menuProperty, target.textContent);
            return;
        }
        const itemProperty = target.dataset.editableProperty;
        const itemElement = target.closest('[data-id]');
        if (itemProperty && itemElement) {
            MenuState.updateItemProperty(itemElement.dataset.id, itemProperty, target.textContent);
        }
    }

    function handleControlsClick(e) {
        const button = e.target.closest('button');
        if (!button || !activeItem) return;
        const action = button.dataset.action;
        const id = activeItem.dataset.id;
        deactivateCurrentItem();
        switch (action) {
            case 'delete':
                if (confirm('¿Estás seguro?')) MenuState.deleteItem(id);
                break;
            case 'duplicate':
                MenuState.duplicateItem(id);
                break;
            case 'add-item':
                MenuState.addItem(id, { titulo: 'Nuevo Ítem', precio: '0.00', type: 'item' });
                break;
            case 'add-category':
                 MenuState.addItem(id, { titulo: 'Nueva Categoría', type: 'category', items: [] });
                 break;
        }
        setChangesMade(true);
        renderMenu();
    }
    
    function handleDocumentClick(e) {
        if (!e.target.closest('#menu-container, .admin-floating-controls, .admin-save-fab')) {
            deactivateCurrentItem();
        }
    }

    function activateItem(itemElement, shouldPositionControls = true) {
        if (itemElement === activeItem) return;
        deactivateCurrentItem();
        activeItem = itemElement;
        activeItem.classList.add('is-active');
        if (shouldPositionControls) positionFloatingControls();
        floatingControls.classList.add('visible');
    }

    function deactivateCurrentItem() {
        if (activeItem) activeItem.classList.remove('is-active');
        activeItem = null;
        floatingControls.classList.remove('visible');
    }

    function positionFloatingControls() {
        if (!activeItem || !floatingControls) return;
        const itemRect = activeItem.getBoundingClientRect();
        const containerRect = itemListContainer.getBoundingClientRect();
        floatingControls.style.top = `${itemRect.top - containerRect.top}px`;
        const type = activeItem.dataset.type;
        const isCategory = type === 'category';
        floatingControls.querySelector('[data-action="add-item"]').style.display = isCategory ? 'inline-flex' : 'none';
        floatingControls.querySelector('[data-action="add-category"]').style.display = isCategory ? 'inline-flex' : 'none';
    }

    function handleSaveMenu() {
        if (isSaving) return;
        const payload = {
            menuData: MenuState.getMenu(),
            dataSource: appConfig.dataSource,
            client: appConfig.config.clientId,
            url: appConfig.config.clientUrl,
            dev: appConfig.config.devId,
        };
        MenuApiService.saveMenu(payload);
    }
    
    function setFabSaving(isSaving) {
        const icon = saveFab.querySelector('i');
        if (!icon) return;
        icon.className = isSaving ? 'fas fa-spinner fa-spin' : 'fas fa-save';
        saveFab.disabled = isSaving;
    }

    function handleSaveSuccess(response) {
        alert(response.message || 'Menú guardado con éxito');
        setChangesMade(false);
    }

    function handleSaveError(error) {
        alert(error);
    }

    if (!window.adminModuleInitializers) window.adminModuleInitializers = {};
    window.adminModuleInitializers.menues = init;

    const initialMenuContainer = document.getElementById('menu-container');
    if (initialMenuContainer) {
        if (document.readyState === 'complete' || document.readyState === 'interactive') {
            init(initialMenuContainer);
        } else {
            document.addEventListener('DOMContentLoaded', () => init(initialMenuContainer));
        }
    }
})();