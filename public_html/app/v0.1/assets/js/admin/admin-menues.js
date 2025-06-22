import { MenuState } from './menues/MenuState.js';
import { MenuView } from './menues/MenuView.js';
import { MenuApiService } from './menues/MenuApiService.js';

(async () => {
    let hasUnsavedChanges = false;
    let appConfig = {};

    function init() {
        const dataset = document.body.dataset;
        const menuContainer = document.getElementById('menu-container');

        if (!menuContainer) {
            console.error("El contenedor principal del módulo #menu-container no fue encontrado.");
            return;
        }

        appConfig = {
            clientId: dataset.clientId,
            publicUrl: dataset.publicUrl,
            clientUrl: dataset.clientUrl,
            devId: dataset.devId,
            initialContext: JSON.parse(menuContainer.dataset.initialJson || '{}'),
            dataSourceFile: menuContainer.dataset.sourceFile
        };
        
        MenuApiService.init({ apiBaseUrl: appConfig.publicUrl });
        MenuView.init({ publicUrl: appConfig.publicUrl, clientUrl: appConfig.clientUrl });
        MenuState.load(appConfig.initialContext.menuData || appConfig.initialContext);

        MenuView.render(MenuState.getMenu());
        setupEventListeners();
        console.log('Controlador de Menús inicializado.');
    }

    function setupEventListeners() {
        const menuItemsContainer = document.getElementById('admin-menu-items-container');
        const saveButton = document.getElementById('fab-save-menu');

        if (menuItemsContainer) {
            menuItemsContainer.addEventListener('click', handleDelegatedClick);
            menuItemsContainer.addEventListener('blur', handleTextEdit, true);
        }
        
        if (saveButton) {
            saveButton.addEventListener('click', handleSaveMenu);
        }

        window.addEventListener('beforeunload', (e) => {
            if (hasUnsavedChanges) {
                e.preventDefault();
                e.returnValue = '';
            }
        });
    }

    function setChangesMade() {
        if (!hasUnsavedChanges) {
            hasUnsavedChanges = true;
            MenuView.setSaveChangesVisible(true);
        }
    }

    async function handleSaveMenu() {
        const saveButton = document.getElementById('fab-save-menu');
        saveButton.classList.add('is-loading');
        
        try {
            const menuData = MenuState.getMenu();
            const payload = {
                menuData: menuData,
                dataSource: appConfig.dataSourceFile,
                client: appConfig.clientId,
                url: appConfig.clientUrl,
                dev: appConfig.devId
            };

            const response = await MenuApiService.saveMenu(payload);
            
            if (response.success) {
                hasUnsavedChanges = false;
                MenuView.setSaveChangesVisible(false);
                alert('¡Menú guardado con éxito!');
            } else {
                throw new Error(response.message || 'El servidor devolvió un error.');
            }

        } catch (error) {
            console.error('Fallo al guardar el menú:', error);
            alert(`Error al guardar: ${error.message}`);
        } finally {
            saveButton.classList.remove('is-loading');
        }
    }

    function handleDelegatedClick(e) {
        const actionTarget = e.target.closest('[data-action]');
        if (!actionTarget) return;

        const action = actionTarget.dataset.action;
        const itemElement = e.target.closest('[data-id]');
        const id = itemElement?.dataset.id;
        
        let needsRender = false;

        switch (action) {
            case 'delete':
                if (confirm('¿Estás seguro de que quieres eliminar este elemento?')) {
                    MenuState.deleteItem(id);
                    needsRender = true;
                }
                break;
            
            case 'toggle-hidden':
                MenuState.toggleItemVisibility(id);
                MenuView.toggleItemVisibility(id);
                setChangesMade();
                return;

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
            
            case 'toggle-options':
                itemElement?.querySelector('.item-actions-panel')?.classList.toggle('is-open');
                return;
        }

        if (needsRender) {
            MenuView.render(MenuState.getMenu());
            setChangesMade();
        }
    }

    function handleTextEdit(e) {
        const target = e.target;
        if (!target.isContentEditable) return;

        const itemElement = target.closest('[data-id]');
        const property = target.dataset.property;

        if (!itemElement || !property) return;

        const id = itemElement.dataset.id;
        const newValue = target.textContent;

        MenuState.updateItemProperty(id, property, newValue);
        setChangesMade();
    }

    document.addEventListener('DOMContentLoaded', init);
})();