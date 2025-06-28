import MenuState from './MenuState.js';

const DragDropManager = (function() {
    let sortableInstances = [];
    let _onDragEndCallback = null;
    let mainContainer = null;
    function init({ container, onDragEnd }) {
        _onDragEndCallback = onDragEnd;
        mainContainer = container; 
        
        if (!mainContainer) {
            console.error("DragDropManager no recibió un contenedor para inicializar.");
            return;
        }

        destroy(); 
        
        const allLists = mainContainer.querySelectorAll('.item-list');
        allLists.forEach(createSortable);
    }

    function createSortable(listElement) {
        const sortable = new Sortable(listElement, {
            group: 'nested-menu', 
            animation: 150,
            fallbackOnBody: true,
            swapThreshold: 0.65,
            handle: '.item-drag-handle',
            draggable: '.is-admin-item',
            dragClass: 'is-actively-dragging', 
            ghostClass: 'is-dragging-ghost',
            forceFallback: true,
            onStart: function (evt) {
                if (evt.item.classList.contains('c-container')) {
                    mainContainer.classList.add('is-category-drag-view');
                }
            },
            
            onEnd: function (evt) {
                mainContainer.classList.remove('is-category-drag-view');

                const draggedItemId = evt.item.dataset.id;
                const newIndex = evt.newIndex;
                
                const parentCategoryElement = evt.to.closest('.c-container');
                const newParentId = parentCategoryElement ? parentCategoryElement.dataset.id : null;
                
                MenuState.reorderItem(draggedItemId, newParentId, newIndex);

                if (_onDragEndCallback) {
                    _onDragEndCallback();
                }
            },
        });

        sortableInstances.push(sortable);
    }

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