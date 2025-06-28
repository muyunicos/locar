import MenuState from './MenuState.js';

const DragDropManager = (function() {
    let sortableInstances = [];
    let _onDragEndCallback = null;
    let mainContainer = null;

    /**
     * Inicializa el sistema de Drag & Drop en todas las listas.
     */
    function init({ container, onDragEnd }) {
        _onDragEndCallback = onDragEnd;
        mainContainer = container; 
        
        if (!mainContainer) {
            console.error("DragDropManager no recibió un contenedor para inicializar.");
            return;
        }

        destroy(); 
        
        // La clave: aplicamos Sortable a TODAS las listas (.item-list)
        const allLists = mainContainer.querySelectorAll('.item-list');
        allLists.forEach(createSortable);
    }

    /**
     * Crea una instancia de Sortable en un elemento de lista.
     */
    function createSortable(listElement) {
        const sortable = new Sortable(listElement, {
            // --- CONFIGURACIÓN CLAVE PARA ANIDAMIENTO ---
            group: 'nested-menu', // Un nombre de grupo único. Todos los que lo compartan pueden intercambiar ítems.
            animation: 150,
            fallbackOnBody: true,
            swapThreshold: 0.65,
            handle: '.item-drag-handle', // El arrastre SÓLO puede empezar en este elemento.
            draggable: '.is-admin-item', // Define qué elementos dentro de la lista son arrastrables.
            ghostClass: 'is-dragging-ghost',
            
            // --- Lógica de Eventos ---
            onStart: function (evt) {
                // Vista simplificada al arrastrar categorías
                if (evt.item.classList.contains('c-container')) {
                    mainContainer.classList.add('is-category-drag-view');
                }
            },
            
            onEnd: function (evt) {
                // Siempre limpiamos la vista simplificada al soltar
                mainContainer.classList.remove('is-category-drag-view');

                const draggedItemId = evt.item.dataset.id;
                const newIndex = evt.newIndex;
                
                // evt.to nos da el elemento de la lista de destino. Con esto encontramos al padre.
                const parentCategoryElement = evt.to.closest('.c-container');
                const newParentId = parentCategoryElement ? parentCategoryElement.dataset.id : null;
                
                // Actualizamos el estado
                MenuState.reorderItem(draggedItemId, newParentId, newIndex);

                // Notificamos al controlador principal que re-renderice todo
                if (_onDragEndCallback) {
                    _onDragEndCallback();
                }
            },
        });

        sortableInstances.push(sortable);
    }

    /**
     * Destruye todas las instancias activas de Sortable.
     */
    function destroy() {
        sortableInstances.forEach(instance => instance.destroy());
        sortableInstances = [];
    }

    return {
        init,
        destroy
    };
})();

export default DragDropManager;