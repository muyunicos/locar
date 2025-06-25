import MenuState from './menues/MenuState.js';
import MenuView from './menues/MenuView.js';
import MenuApiService from './menues/MenuApiService.js';
import DragDropManager from './menues/DragDropManager.js';

(function() {
    let appConfig = {};
    let activeItemElement = null;
    let menuContainer, saveFab, itemListContainer;
    let isSaving = false;

    function init(moduleElement) {
        menuContainer = moduleElement;
        if (!menuContainer) {
             console.error("Error crítico: La función init del editor de menús fue llamada sin un elemento de módulo.");
             return;
        }

        saveFab = document.querySelector('.admin-fab');
        itemListContainer = menuContainer.querySelector('#item-list-container');

        if (!saveFab || !itemListContainer) {
            console.error("Faltan elementos esenciales del DOM para el editor de menús.");
            return;
        }

        const globalConfig = window.appConfig || {}; 
        appConfig = {
            ...globalConfig,
            dataSource: menuContainer.dataset.sourceFile,
            initialData: JSON.parse(menuContainer.dataset.initialJson || '{}'),
        };

        MenuState.load(appConfig.initialData);
        MenuView.init(menuContainer); 
        MenuApiService.init(appConfig); 
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
        itemListContainer.addEventListener('input', handleContentEdit, true);
        itemListContainer.addEventListener('click', handleItemClick);
        document.addEventListener('click', handleDocumentClick, true);
        saveFab.addEventListener('click', handleSaveMenu);
    }

    function renderMenu() {
        const activeId = activeItemElement ? activeItemElement.dataset.id : null;
        MenuView.render(MenuState.getMenu());
        
        if (activeId) {
            const newActiveElement = itemListContainer.querySelector(`[data-id="${activeId}"]`);
            if (newActiveElement) {
                setActiveItem(newActiveElement);
            }
        }
    }

    function setChangesMade(state) {
        MenuState.setChanges(state);
        saveFab.classList.toggle('is-hidden', !state);
    }


    function handleContentEdit(e) {
        const target = e.target;
        if (!target.isContentEditable) { return; }

        setChangesMade(true);

        const menuProperty = target.dataset.editableMenuProperty;
        const itemProperty = target.dataset.editableProperty;
        const itemElement = target.closest('[data-id]');

        if (menuProperty) {
            MenuState.updateMenuProperty(menuProperty, target.textContent.trim());
            return;
        }
        
        if (itemProperty && itemElement) {
            let value = target.textContent.trim();
            if (itemProperty === 'precio') {
                value = parseFloat(String(value).replace(/[$.]/g, '').replace(',', '.')) || 0;
            }
            MenuState.updateItemProperty(itemElement.dataset.id, itemProperty, value);
        }
    }


    function handleItemClick(e) {
        const itemElement = e.target.closest('.is-admin-item');
        const optionsTrigger = e.target.closest('.options-trigger');
        const actionButton = e.target.closest('.options-popup button');

        if (optionsTrigger) {
            e.preventDefault();
            toggleOptionsMenu(optionsTrigger.closest('.item-actions-panel'));
            return;
        }

        if (actionButton) {
            e.preventDefault();
            handleAction(actionButton, itemElement.dataset.id);
            return;
        }

        if (itemElement) {
            setActiveItem(itemElement);
        }
    }

    function handleAction(button, itemId) {
        const action = button.dataset.action;
        if (!itemId) return;

        let confirmAction = true;
        if (action === 'delete') {
            confirmAction = confirm('¿Estás seguro de que quieres eliminar este ítem? Esta acción no se puede deshacer.');
        }

        if (confirmAction) {
            switch(action) {
                case 'delete':
                    MenuState.deleteItem(itemId);
                    activeItemElement = null;
                    break;
                case 'duplicate':
                    MenuState.duplicateItem(itemId);
                    break;
                case 'toggle-visibility':
                    MenuState.toggleVisibility(itemId);
                    break;
            }
            setChangesMade(true);
            renderMenu();
        }
        
        closeAllOptionMenus();
    }


    function toggleOptionsMenu(actionsPanel) {
        const wasOpen = actionsPanel.classList.contains('is-open');
        closeAllOptionMenus();
        if (!wasOpen) {
            actionsPanel.classList.add('is-open');
        }
    }
    

    function closeAllOptionMenus() {
        itemListContainer.querySelectorAll('.item-actions-panel.is-open').forEach(panel => {
            panel.classList.remove('is-open');
        });
    }


    function setActiveItem(itemElement) {
        if (itemElement === activeItemElement) return;

        if (activeItemElement) {
            activeItemElement.classList.remove('is-active-admin-item');
        }

        activeItemElement = itemElement;
        activeItemElement.classList.add('is-active-admin-item');
        closeAllOptionMenus();
    }


    function deactivateCurrentItem() {
        if (activeItemElement) {
            activeItemElement.classList.remove('is-active-admin-item');
            activeItemElement = null;
        }
        closeAllOptionMenus();
    }
    
    function handleDocumentClick(e) {
        const isClickInsideMenu = e.target.closest('#item-list-container, .admin-fab');
        const isClickOnActions = e.target.closest('.item-actions-panel');

        if (!isClickInsideMenu) {
            deactivateCurrentItem();
        }
        
        if (!isClickOnActions) {
            closeAllOptionMenus();
        }
    }
    

    async function handleSaveMenu() {
        if (isSaving) return;
        isSaving = true;
        setFabState('is-saving');

        const payload = {
            menuData: MenuState.getMenu(),
            dataSource: appConfig.dataSource,
        };

        try {
            const response = await MenuApiService.saveMenu(payload);
            handleSaveSuccess(response);
        } catch (error) {
            handleSaveError(error.message || 'Error desconocido.');
        } finally {
            isSaving = false;
        }
    }
    
    function setFabState(state = '') {
        const button = saveFab.querySelector('button');
        if (!button) return;
        saveFab.classList.remove('is-saving', 'is-success', 'is-error');
        button.disabled = false;

        if (state) {
            saveFab.classList.add(state);
            if (state === 'is-saving') {
                button.disabled = true;
            }
        }
    }

function handleSaveSuccess(response) {
    MenuState.setChanges(false);

    setFabState('is-success');
    
    setTimeout(() => {
        setChangesMade(MenuState.getChanges());
        setFabState('');
    }, 2000);
}

    function handleSaveError(error) {
        console.error('Error al guardar:', error);
        setFabState('is-error');
        setTimeout(() => {
            setFabState('');
            setChangesMade(true);
        }, 2500);
    }

    if (!window.adminModuleInitializers) window.adminModuleInitializers = {};
    window.adminModuleInitializers.menues = init;
    
    const initialMenuContainer = document.querySelector('[data-module-id="menues"][data-initial-json]');
    if (initialMenuContainer) {
        if (document.readyState === 'complete' || document.readyState === 'interactive') {
            init(initialMenuContainer);
        } else {
            document.addEventListener('DOMContentLoaded', () => init(initialMenuContainer));
        }
    }
})();