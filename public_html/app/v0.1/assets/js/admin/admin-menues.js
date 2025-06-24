import MenuState from './menues/MenuState.js';
import MenuView from './menues/MenuView.js';
import MenuApiService from './menues/MenuApiService.js';
import DragDropManager from './menues/DragDropManager.js';

(function() {
    // Declaración de variables para el módulo
    let appConfig = {};
    let activeItemElement = null; // El elemento del DOM que está seleccionado
    let menuContainer, saveFab, itemListContainer;
    let isSaving = false;

    /**
     * Inicializa el editor de menús para un elemento de módulo específico.
     * @param {HTMLElement} moduleElement - El contenedor principal del módulo de menú.
     */
    function init(moduleElement) {
        menuContainer = moduleElement;
        if (!menuContainer) {
             console.error("Error crítico: La función init del editor de menús fue llamada sin un elemento de módulo.");
             return;
        }

        // Referencias a elementos clave del DOM
        saveFab = menuContainer.querySelector('.admin-fab');
        itemListContainer = menuContainer.querySelector('#item-list-container');

        if (!saveFab || !itemListContainer) {
            console.error("Faltan elementos esenciales del DOM para el editor de menús.");
            return;
        }

        // Carga la configuración global y específica del módulo
        const globalConfig = window.appConfig || {}; 
        appConfig = {
            ...globalConfig,
            dataSource: menuContainer.dataset.sourceFile,
            initialData: JSON.parse(menuContainer.dataset.initialJson || '{}'),
        };

        // Inicialización de los sub-módulos de JS
        MenuState.load(appConfig.initialData);
        MenuView.init(menuContainer); 
        MenuApiService.init(appConfig); 
        DragDropManager.init({
            onDragEnd: () => {
                setChangesMade(true);
                renderMenu(); // Re-renderizar para asegurar consistencia
            }
        });

        setupEventListeners();
        renderMenu();
    }

    /**
     * Configura todos los listeners de eventos necesarios para la edición.
     */
    function setupEventListeners() {
        // 'focusout' es más fiable que 'input' para contenido editable,
        // ya que se dispara cuando el usuario termina de editar.
        itemListContainer.addEventListener('input', handleContentEdit, true);
        
        // Un único listener en el contenedor para manejar todas las acciones de los ítems.
        itemListContainer.addEventListener('click', handleItemClick);
        
        // Listener para deseleccionar ítems si se hace clic fuera del área de trabajo.
        document.addEventListener('click', handleDocumentClick, true);

        // Listener para el botón flotante de guardado.
        saveFab.addEventListener('click', handleSaveMenu);
    }
    
    /**
     * Renderiza o vuelve a dibujar el menú completo usando los datos de MenuState.
     */
    function renderMenu() {
        // Guarda el ID del ítem activo para poder re-seleccionarlo después de renderizar.
        const activeId = activeItemElement ? activeItemElement.dataset.id : null;
        
        MenuView.render(MenuState.getMenu());
        
        // Si había un ítem activo, lo busca en el nuevo DOM y lo vuelve a activar.
        if (activeId) {
            const newActiveElement = itemListContainer.querySelector(`[data-id="${activeId}"]`);
            if (newActiveElement) {
                setActiveItem(newActiveElement);
            }
        }
    }
    
    /**
     * Activa o desactiva el botón de guardar y actualiza el estado de cambios.
     * @param {boolean} state - True si hay cambios sin guardar, false si no.
     */
    function setChangesMade(state) {
        MenuState.setChanges(state);
        saveFab.classList.toggle('is-hidden', !state);
    }

    /**
     * Maneja la edición de cualquier campo 'contenteditable'.
     * @param {Event} e - El evento 'focusout'.
     */
    function handleContentEdit(e) {
        const target = e.target;
        if (!target.isContentEditable) return;

        setChangesMade(true);

        const menuProperty = target.dataset.editableMenuProperty;
        const itemProperty = target.dataset.editableProperty;
        const itemElement = target.closest('[data-id]');

        // Si se está editando una propiedad general del menú (ej. el título principal)
        if (menuProperty) {
            MenuState.updateMenuProperty(menuProperty, target.textContent.trim());
            return;
        }
        
        // Si se está editando la propiedad de un ítem
        if (itemProperty && itemElement) {
            let value = target.textContent.trim();
            
            // Si la propiedad es 'precio', se convierte el texto formateado a un número.
            // Ej: "$1.500,50" -> 1500.50
            if (itemProperty === 'precio') {
                value = parseFloat(String(value).replace(/[$.]/g, '').replace(',', '.')) || 0;
            }
            MenuState.updateItemProperty(itemElement.dataset.id, itemProperty, value);
        }
    }

    /**
     * Maneja todos los clics que ocurren dentro de la lista de ítems.
     * @param {Event} e - El evento 'click'.
     */
    function handleItemClick(e) {
        const itemElement = e.target.closest('.is-admin-item');
        const optionsTrigger = e.target.closest('.options-trigger');
        const actionButton = e.target.closest('.options-popup button');

        // Si se hizo clic en el botón de opciones (...)
        if (optionsTrigger) {
            e.preventDefault();
            toggleOptionsMenu(optionsTrigger.closest('.item-actions-panel'));
            return;
        }

        // Si se hizo clic en un botón de acción (ej. 'Eliminar')
        if (actionButton) {
            e.preventDefault();
            handleAction(actionButton, itemElement.dataset.id);
            return;
        }

        // Si se hizo clic en cualquier otra parte de un ítem, se selecciona.
        if (itemElement) {
            setActiveItem(itemElement);
        }
    }

    /**
     * Ejecuta una acción (duplicar, eliminar, etc.) sobre un ítem.
     * @param {HTMLElement} button - El botón que fue presionado.
     * @param {string} itemId - El ID del ítem a modificar.
     */
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
                    // Como el ítem ya no existe, lo deseleccionamos.
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
            renderMenu(); // Vuelve a dibujar el menú para reflejar el cambio.
        }
        
        closeAllOptionMenus(); // Cierra el popup de opciones después de la acción.
    }

    /**
     * Abre o cierra el menú de opciones para un panel de acciones.
     * @param {HTMLElement} actionsPanel - El panel que contiene el menú.
     */
    function toggleOptionsMenu(actionsPanel) {
        const wasOpen = actionsPanel.classList.contains('is-open');
        closeAllOptionMenus(); // Cierra cualquier otro menú que esté abierto.
        if (!wasOpen) {
            actionsPanel.classList.add('is-open');
        }
    }
    
    /**
     * Cierra todos los menús de opciones abiertos.
     */
    function closeAllOptionMenus() {
        itemListContainer.querySelectorAll('.item-actions-panel.is-open').forEach(panel => {
            panel.classList.remove('is-open');
        });
    }

    /**
     * Establece un ítem como el activo, actualizando su estilo visual.
     * @param {HTMLElement} itemElement - El elemento a activar.
     */
    function setActiveItem(itemElement) {
        if (itemElement === activeItemElement) return;

        if (activeItemElement) {
            activeItemElement.classList.remove('is-active-admin-item');
        }

        activeItemElement = itemElement;
        activeItemElement.classList.add('is-active-admin-item');
        
        // Cierra los menús de opciones al seleccionar un nuevo ítem.
        closeAllOptionMenus();
    }

    /**
     * Deselecciona cualquier ítem que esté activo.
     */
    function deactivateCurrentItem() {
        if (activeItemElement) {
            activeItemElement.classList.remove('is-active-admin-item');
            activeItemElement = null;
        }
        closeAllOptionMenus();
    }
    
    /**
     * Maneja clics en el documento para deseleccionar ítems o cerrar menús.
     * @param {Event} e - El evento 'click'.
     */
    function handleDocumentClick(e) {
        const isClickInsideMenu = e.target.closest('#item-list-container, .admin-fab');
        const isClickOnActions = e.target.closest('.item-actions-panel');

        // Si se hace clic fuera del área de trabajo, deselecciona el ítem activo.
        if (!isClickInsideMenu) {
            deactivateCurrentItem();
        }
        
        // Si se hace clic en cualquier lugar que no sea el panel de acciones, se cierra.
        if (!isClickOnActions) {
            closeAllOptionMenus();
        }
    }
    
    /**
     * Maneja el proceso de guardado del menú.
     */
    async function handleSaveMenu() {
        if (isSaving) return;
        isSaving = true;
        setFabSaving(true);

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
            setFabSaving(false);
        }
    }
    
    /**
     * Actualiza la UI del botón de guardado para mostrar un estado de carga.
     * @param {boolean} saving - True si está guardando, false si no.
     */
    function setFabSaving(saving) {
        const button = saveFab.querySelector('button');
        const icon = button.querySelector('svg');
        if (!button || !icon) return;
        
        button.disabled = saving;
        if (saving) {
            // Icono de spinner (puedes reemplazarlo con uno de FontAwesome si lo usas)
            icon.innerHTML = '<path d="M12 4V2A10 10 0 0 0 2 12h2a8 8 0 0 1 8-8Z" class="spinner-path" />';
            icon.classList.add('is-spinning');
        } else {
            icon.innerHTML = '<path d="M17 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14c1.1 0 2-.9 2-2V7l-4-4zm-5 16c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3zm3-10H5V5h10v4z"/>';
            icon.classList.remove('is-spinning');
        }
    }

    /**
     * Maneja la respuesta exitosa del guardado.
     * @param {object} response - La respuesta del servidor.
     */
    function handleSaveSuccess(response) {
        alert(response.message || 'Menú guardado con éxito');
        setChangesMade(false);
    }

    /**
     * Maneja los errores durante el guardado.
     * @param {string} error - El mensaje de error.
     */
    function handleSaveError(error) {
        alert('Error al guardar: ' + error);
    }

    // Registra la función `init` para que pueda ser llamada cuando se cargue el módulo.
    if (!window.adminModuleInitializers) window.adminModuleInitializers = {};
    window.adminModuleInitializers.menues = init;
    
    // Si el módulo ya está en la página en la carga inicial, lo inicializa.
    const initialMenuContainer = document.querySelector('[data-module-id="menues"][data-initial-json]');
    if (initialMenuContainer) {
        // Asegurarse de que el DOM esté listo
        if (document.readyState === 'complete' || document.readyState === 'interactive') {
            init(initialMenuContainer);
        } else {
            document.addEventListener('DOMContentLoaded', () => init(initialMenuContainer));
        }
    }
})();