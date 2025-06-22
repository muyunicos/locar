/**
 * admin-menues.js (Controlador Principal)
 * * Orquesta la página de administración de menús.
 * - Inicializa los módulos de Vista, Estado y API.
 * - Maneja los eventos del usuario.
 * - Conecta la Vista con el Estado.
 */

// Importamos los módulos que hemos creado.
import { MenuState } from './menues/MenuState.js';
import { MenuView } from './menues/MenuView.js';
import { MenuApiService } from './menues/MenuApiService.js';

// Usamos un IIFE asíncrono que se ejecuta cuando el DOM está listo.
(async () => {
    // Variable para rastrear si hay cambios sin guardar.
    let hasUnsavedChanges = false;

    /**
     * Función principal de inicialización.
     */
    function init() {
        // 1. Leer la configuración desde los atributos data-* del body.
        const body = document.body;
        const config = {
            clientId: body.dataset.clientId,
            publicUrl: body.dataset.publicUrl,
            clientUrl: body.dataset.clientUrl,
            initialContext: JSON.parse(body.dataset.initialContext || '{}')
        };
        
        // 2. Inicializar los módulos con la configuración leída.
        MenuApiService.init({ apiBaseUrl: config.publicUrl });
        MenuView.init({ publicUrl: config.publicUrl, clientUrl: config.clientUrl });
        MenuState.load(config.initialContext.menuData); // Asumimos que la data inicial está en initialContext.menuData

        // 3. Renderizar la vista inicial con los datos del estado.
        MenuView.render(MenuState.getMenu());

        // 4. Configurar todos los manejadores de eventos.
        setupEventListeners();

        console.log('Controlador de Menús inicializado.');
    }

    /**
     * Configura todos los listeners de eventos de la página.
     */
    function setupEventListeners() {
        const menuContainer = document.getElementById('admin-menu-items-container');
        const saveButton = document.getElementById('fab-save-menu');

        if (menuContainer) {
            menuContainer.addEventListener('click', handleDelegatedClick);
            menuContainer.addEventListener('blur', handleTextEdit, true); // Usar captura para eventos 'blur'
        }
        
        if (saveButton) {
            saveButton.addEventListener('click', handleSaveMenu);
        }

        window.addEventListener('beforeunload', (e) => {
            if (hasUnsavedChanges) {
                e.preventDefault();
                e.returnValue = ''; // Requerido por algunos navegadores.
            }
        });
    }

    /**
     * Marca que hay cambios y muestra el botón de guardar.
     */
    function setChangesMade() {
        if (!hasUnsavedChanges) {
            hasUnsavedChanges = true;
            MenuView.setSaveChangesVisible(true);
        }
    }

    /**
     * Manejador centralizado para clicks en ítems y categorías.
     * @param {Event} e 
     */
    function handleDelegatedClick(e) {
        const actionTarget = e.target.closest('[data-action]');
        if (!actionTarget) return;

        const action = actionTarget.dataset.action;
        const itemElement = e.target.closest('[data-id]');
        const id = itemElement?.dataset.id;
        
        if (!id && action !== 'add-category' && action !== 'add-item') return; // Algunas acciones pueden no tener ID

        let needsRender = false;

        switch (action) {
            case 'delete':
                if (confirm('¿Estás seguro de que quieres eliminar este elemento?')) {
                    MenuState.deleteItem(id);
                    needsRender = true;
                }
                break;
            
            case 'toggle-hidden':
                const item = MenuState.getMenu().items.find(i => i.id === id); // Simplificado, necesita la búsqueda recursiva del state
                // Una versión mejorada implicaría que MenuState.toggle... devuelva el nuevo estado.
                MenuState.updateItemProperty(id, 'ocultar', !item.ocultar);
                MenuView.toggleItemVisibility(id); // Actualización eficiente sin re-renderizar todo
                setChangesMade();
                break;

            // ... aquí irían los casos para 'duplicate', 'add-item', etc.
            
            case 'toggle-options':
                const panel = itemElement.querySelector('.item-actions-panel');
                panel.classList.toggle('is-open');
                break;
        }

        if (needsRender) {
            MenuView.render(MenuState.getMenu());
            setChangesMade();
        }
    }

    /**
     * Maneja la edición de texto en campos contenteditable.
     * @param {FocusEvent} e 
     */
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

    /**
     * Maneja el guardado del menú.
     */
    async function handleSaveMenu() {
        const saveButton = document.getElementById('fab-save-menu');
        saveButton.classList.add('is-loading');
        
        try {
            const currentMenuData = MenuState.getMenu();
            const clientName = document.body.dataset.clientId;

            // TODO: Aquí deberíamos aplicar la transformación de nombres de claves si es necesario
            // (ej: 'titulo' -> 'menu_title') antes de enviar a la API.

            const response = await MenuApiService.saveMenu(currentMenuData, clientName);
            
            if (response.success) {
                hasUnsavedChanges = false;
                MenuView.setSaveChangesVisible(false);
                // Opcional: mostrar una notificación de éxito.
                alert('¡Menú guardado con éxito!');
            } else {
                throw new Error(response.message || 'El servidor devolvió un error.');
            }

        } catch (error) {
            console.error('Fallo al guardar el menú:', error);
            // Opcional: mostrar una notificación de error al usuario.
            alert(`Error al guardar: ${error.message}`);
        } finally {
            saveButton.classList.remove('is-loading');
        }
    }

    // Iniciar la aplicación cuando el DOM esté completamente cargado.
    document.addEventListener('DOMContentLoaded', init);

})();