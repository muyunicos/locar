import MenuState from './MenuState.js';

const DragDropManager = (function() {
    // Guardaremos las instancias de Sortable para poder destruirlas si es necesario.
    let sortableInstances = [];
    let _onDragEndCallback = null;

    /**
     * Inicializa el sistema de Drag & Drop en el contenedor principal y en todas las sub-listas.
     */
    function init({ onDragEnd }) {
        _onDragEndCallback = onDragEnd;
        // Limpiamos instancias viejas si se re-inicializa
        destroy(); 
        
        const mainList = document.getElementById('item-list-container');
        if (mainList) {
            // Hacemos "ordenable" la lista principal
            createSortable(mainList);

            // Buscamos todas las sub-listas (dentro de las categorías) y también las hacemos "ordenables"
            const subLists = mainList.querySelectorAll('.item-list');
            subLists.forEach(createSortable);
        }
    }

    /**
     * Crea una instancia de Sortable en un elemento de lista.
     * @param {HTMLElement} listElement - El elemento (ul, div) que contiene los ítems a ordenar.
     */
    function createSortable(listElement) {
        const sortable = new Sortable(listElement, {
            group: 'nested', // Permite mover ítems entre listas del mismo grupo
            animation: 150,  // Animación suave al soltar
            handle: '.item-drag-handle', // Solo se puede arrastrar desde el manejador
            ghostClass: 'is-dragging-ghost', // Clase CSS para el elemento "fantasma"
            dragClass: 'is-dragging', // Clase CSS para el elemento que se está arrastrando
            
            // Se llama cuando un ítem se suelta en una nueva posición
            onEnd: function (evt) {
                const draggedItemId = evt.item.dataset.id;
                const newIndex = evt.newIndex;
                
                // Determinamos el nuevo contenedor padre
                const newParentList = evt.to;
                const parentCategoryElement = newParentList.closest('.c-container');
                const newParentId = parentCategoryElement ? parentCategoryElement.dataset.id : null;
                
                // Actualizamos el estado con la nueva información
                MenuState.reorderItem(draggedItemId, newParentId, newIndex);

                // Llamamos al callback para que la vista principal se re-renderice
                if (_onDragEndCallback) {
                    _onDragEndCallback();
                }
            },
        });

        // Guardamos la instancia para poder limpiarla después
        sortableInstances.push(sortable);
    }

    /**
     * Destruye todas las instancias de Sortable.
     * Útil si necesitas recargar la interfaz sin recargar la página.
     */
    function destroy() {
        sortableInstances.forEach(instance => instance.destroy());
        sortableInstances = [];
    }

    // Exponemos públicamente solo los métodos necesarios
    return {
        init,
        destroy
    };
})();

export default DragDropManager;