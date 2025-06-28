import MenuState from './menues/MenuState.js';
import MenuView from './menues/MenuView.js';
import MenuApiService from './menues/MenuApiService.js';
import DragDropManager from './menues/DragDropManager.js';
import ImageManager from '../ImageManager.js';
(function() {
    let appConfig = {};
    let activeItemElement = null;
    let menuContainer, saveFab, itemListContainer;
    let isSaving = false;
    async function init(moduleElement) {
        menuContainer = moduleElement;
        if (!menuContainer) {
            console.error("Error crítico: El editor de menús no encontró su contenedor principal.");
            return;
        }
        saveFab = document.querySelector('.admin-fab');
        itemListContainer = menuContainer.querySelector('#item-list-container');
        if (!saveFab || !itemListContainer) {
            console.error("Faltan elementos esenciales del DOM (FAB o lista de ítems).");
            return;
        }
        appConfig = window.appConfig || {};
        await ImageManager.init();
        MenuState.load(JSON.parse(menuContainer.dataset.initialJson || '{}'));
        MenuApiService.init(appConfig);
        MenuView.init(menuContainer, {
            onImageClick: (itemId) => ImageManager.openModal(itemId)
        });
        DragDropManager.init({
            container: moduleElement,
            onDragEnd: () => {
                setChangesMade(true);
                renderMenu();
            }
        });
        setupEventListeners();
        renderMenu();
        console.log("Editor de Menús inicializado correctamente.");
    }

    function setupEventListeners() {
        menuContainer.addEventListener('input', handleContentEdit);
        menuContainer.addEventListener('click', handleItemClick);
        document.addEventListener('click', handleDocumentClick, true);
        saveFab.addEventListener('click', handleSaveMenu);
        document.addEventListener('imageSelected', (e) => {
            const {
                itemId,
                imageName
            } = e.detail;
            MenuState.updateItemProperty(itemId, 'imagen', imageName);
            setChangesMade(true);
            renderMenu();
        });
    }

    function renderMenu() {
        const activeId = activeItemElement ? activeItemElement.dataset.id : null;
        MenuView.render(MenuState.getMenu());
        DragDropManager.init({
            container: menuContainer,
            onDragEnd: () => {
                setChangesMade(true);
                renderMenu();
            }
        });
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
        if (!target.isContentEditable) return;
        setChangesMade(true);
        const itemElement = target.closest('[data-id]');
        const property = target.dataset.editableProperty;
        if (property && itemElement) {
            let value = target.textContent.trim();
            if (property === 'precio') {
                value = value.replace(/\D/g, '');
                value = parseFloat(value) || 0;
            }
            MenuState.updateItemProperty(itemElement.dataset.id, property, value);
        } else if (target.dataset.editableMenuProperty) {
            MenuState.updateMenuProperty(target.dataset.editableMenuProperty, target.textContent.trim());
        }
    }

    function handleItemClick(e) {
        const itemElement = e.target.closest('.is-admin-item');
        if (!itemElement) return;
        const imageWrapper = e.target.closest('.item-imagen-wrapper');
        if (imageWrapper) {
            setActiveItem(itemElement);
            ImageManager.openModal(itemElement.dataset.id);
        }
        const optionsTrigger = e.target.closest('.options-trigger');
        if (optionsTrigger) {
            e.preventDefault();
            toggleOptionsMenu(optionsTrigger.closest('.item-actions-panel'));
            return;
        }
        const actionButton = e.target.closest('.options-popup button');
        if (actionButton) {
            e.preventDefault();
            handleAction(actionButton, itemElement.dataset.id);
            return;
        }
        setActiveItem(itemElement);
    }

    function handleAction(button, itemId) {
        const actionsPanel = button.closest('.item-actions-panel');
        if (!actionsPanel || !actionsPanel.classList.contains('is-open')) return;
        const action = button.dataset.action;
        const parentId = button.dataset.parentId;
        if (action.startsWith('create-')) {
            if (action === 'create-item') MenuState.createItem(parentId || null);
            else if (action === 'create-category') MenuState.createCategory(parentId || null);
        } else {
            if (!itemId) return;
            if (action === 'delete' && !confirm('¿Estás seguro? Esta acción no se puede deshacer.')) return;
            switch (action) {
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
        }
        setChangesMade(true);
        renderMenu();
        closeAllOptionMenus();
    }

    function handleDocumentClick(e) {
        if (!e.target.closest('#item-list-container, .admin-fab, #image-manager-modal')) {
            deactivateCurrentItem();
        }
        if (!e.target.closest('.item-actions-panel')) {
            closeAllOptionMenus();
        }
    }
    async function handleSaveMenu() {
        if (isSaving) return;
        isSaving = true;
        setFabState('is-saving');
        try {
            await MenuApiService.saveMenu({
                menuData: MenuState.getMenu()
            });
            handleSaveSuccess();
        } catch (error) {
            handleSaveError(error.message);
        } finally {
            isSaving = false;
        }
    }

    function toggleOptionsMenu(panel) {
        const wasOpen = panel.classList.contains('is-open');
        closeAllOptionMenus();
        if (!wasOpen) panel.classList.add('is-open');
    }

    function closeAllOptionMenus() {
        itemListContainer.querySelectorAll('.item-actions-panel.is-open').forEach(p => p.classList.remove('is-open'));
    }

    function setActiveItem(element) {
        if (activeItemElement === element) return;
        if (activeItemElement) activeItemElement.classList.remove('is-active-admin-item');
        activeItemElement = element;
        if (activeItemElement) activeItemElement.classList.add('is-active-admin-item');
        closeAllOptionMenus();
    }

    function deactivateCurrentItem() {
        if (activeItemElement) {
            activeItemElement.classList.remove('is-active-admin-item');
            activeItemElement = null;
        }
        closeAllOptionMenus();
    }

    function setFabState(state) {
        saveFab.className = 'admin-fab';
        if (state) saveFab.classList.add(state);
        saveFab.querySelector('button').disabled = (state === 'is-saving');
    }

    function handleSaveSuccess() {
        MenuState.setChanges(false);
        setFabState('is-success');
        setTimeout(() => setFabState(''), 2000);
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
    const initialMenuContainer = document.querySelector('div[id^="menues-container-"][data-initial-json]');
    if (initialMenuContainer) {
        if (document.readyState === 'complete' || document.readyState === 'interactive') {
            init(initialMenuContainer);
        } else {
            document.addEventListener('DOMContentLoaded', () => init(initialMenuContainer));
        }
    }
})();