import MenuState from './menues/MenuState.js';
import MenuView from './menues/MenuView.js';
import MenuApiService from './menues/MenuApiService.js';
import DragDropManager from './menues/DragDropManager.js';

(function() {
    // Declaración de variables a nivel de ámbito para ser accesibles en todo el IIFE
    let appConfig = {}; // Ahora será el objeto de configuración general
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

        floatingControls = menuContainer.querySelector('.admin-controls');
        saveFab = menuContainer.querySelector('.admin-fab');
        itemListContainer = menuContainer.querySelector('#item-list-container');

        if (!floatingControls || !saveFab || !itemListContainer) {
            console.error("Faltan elementos esenciales del DOM para el editor de menús.");
            return;
        }
        
        // --- INICIO: CORRECCIÓN DE LA INICIALIZACIÓN DE appConfig ---
        // Accede a la configuración global (window.appConfig)
        const globalConfig = window.appConfig || {}; 
        
        // Asigna la configuración específica del módulo desde el globalConfig
        // Esto asume que tu PHP ya está pasando dataSourceFile y initialJson dentro de window.appConfig
        // como lo discutimos en "Consolidando data-source-file y data-initial-json en window.appConfig".
        // Si no, deberás ajustar tu PHP para incluir estas propiedades en window.appConfig.
        appConfig = {
            clientId: globalConfig.clientId,
            clientUrl: globalConfig.clientUrl,
            publicUrl: globalConfig.publicUrl,
            devId: globalConfig.devId, // Corresponde a DEV_BRANCH en PHP
            dataSource: globalConfig.dataSourceFile, // Asumiendo que PHP lo pasa como 'dataSourceFile'
            initialData: globalConfig.initialJson || {}, // Asumiendo que PHP lo pasa como 'initialJson' y ya está parseado
        };

        // Si todavía usas data-attributes para dataSource y initialData (menos recomendado),
        // podrías hacer un fallback o un merge, pero lo ideal es eliminarlos del HTML.
        // Ejemplo de fallback si el JS del módulo se carga ANTES de que PHP inyecte el script global:
        // appConfig.dataSource = appConfig.dataSource || menuContainer.dataset.sourceFile;
        // appConfig.initialData = appConfig.initialData || JSON.parse(menuContainer.dataset.initialJson || '{}');
        // --- FIN: CORRECCIÓN DE LA INICIALIZACIÓN DE appConfig ---

        MenuState.load(appConfig.initialData);
        MenuView.init(menuContainer); 
        // PASAR appConfig a MenuApiService para que tenga acceso a clientId, publicUrl, etc.
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
    saveFab.classList.toggle('is-hidden', !state);
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

async function handleSaveMenu() {
    if (isSaving) return;
    isSaving = true;
    setFabSaving(true);

    // Los parámetros ya están en appConfig, los pasamos en el payload
    const payload = {
        menuData: MenuState.getMenu(),
        dataSource: appConfig.dataSource, // Ahora viene de appConfig
        client_id: appConfig.clientId,    // Usar client_id
        url: appConfig.clientUrl,         // Usar clientUrl
        dev_branch: appConfig.devId       // Usar dev_branch
    };

    try {
        // MenuApiService necesita la publicUrl del appConfig para construir el endpoint
        const response = await MenuApiService.saveMenu(payload);
        handleSaveSuccess(response);

    } catch (error) {
        handleSaveError(error.message || 'Error desconocido.');

    } finally {
        isSaving = false;
        setFabSaving(false);
    }
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
        // Opcional: Mostrar server_logs aquí también si saveMenu los devuelve
        if (response.server_logs && Array.isArray(response.server_logs)) {
            console.groupCollapsed("PHP Server-Side Logs (Menu Save)");
            response.server_logs.forEach(log => console.log(log));
            console.groupEnd();
        }
    }

    function handleSaveError(error) {
        alert(error);
        // Opcional: Mejorar el manejo de errores para mostrar en el DOM
    }

    if (!window.adminModuleInitializers) window.adminModuleInitializers = {};
    window.adminModuleInitializers.menues = init;

    const initialMenuContainer = document.getElementById('menu-container');
    if (initialMenuContainer) {
        // Asegurarse de que el script se inicialice después de que el DOM esté completamente cargado
        // y window.appConfig esté disponible.
        // Ya tienes document.addEventListener('DOMContentLoaded', ...); en el nivel superior,
        // así que init() puede ser llamado directamente si el contenedor existe.
        // Pero el appConfig aún puede no estar listo si el script se ejecuta demasiado rápido.
        // Una forma más segura es asegurar que window.appConfig exista antes de llamar a init.
        if (document.readyState === 'complete' || document.readyState === 'interactive') {
            // Un pequeño retraso para asegurar que window.appConfig se ha poblado, si el script global
            // se carga justo antes de este módulo.
            setTimeout(() => {
                if (window.appConfig) { // Doble check
                    init(initialMenuContainer);
                } else {
                    console.error("admin-menues.js: window.appConfig no disponible en la inicialización.");
                }
            }, 0); // Retraso mínimo para que el stack de ejecución se vacíe
        } else {
            document.addEventListener('DOMContentLoaded', () => {
                if (window.appConfig) {
                    init(initialMenuContainer);
                } else {
                    console.error("admin-menues.js: window.appConfig no disponible después de DOMContentLoaded.");
                }
            });
        }
    }
})();