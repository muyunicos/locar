import MenuState from './MenuState.js';
import MenuView from './MenuView.js';

const DragDropManager = (function() {
    let draggedElement = null;
    let placeholder = null;
    let draggedId = null;
    let _onDragEndCallback = null;

    function init({ onDragEnd }) {
        _onDragEndCallback = onDragEnd;
        const container = document.getElementById('item-list-container');
        if (!container) return;

        container.addEventListener('dragstart', handleDragStart);
        container.addEventListener('dragover', handleDragOver);
        container.addEventListener('dragleave', handleDragLeave);
        container.addEventListener('drop', handleDrop);
        container.addEventListener('dragend', handleDragEnd);

        placeholder = document.createElement('div');
        placeholder.className = 'placeholder';
    }

    function handleDragStart(e) {

        const dragHandle = e.target.closest('.item-drag-handle');
        if (!dragHandle) {
            e.preventDefault();
            return;
        }

        draggedElement = e.target.closest('.item, .c-container');
        
        draggedId = draggedElement.dataset.id;
e.dataTransfer.setData('text/plain', draggedId); // Añade el ID a la transferencia

        setTimeout(() => {
            if (draggedElement) {
                draggedElement.classList.add('is-dragging');
            }
        }, 0);
        
        e.dataTransfer.effectAllowed = 'move';
    }

    function handleDragOver(e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';

        const targetElement = e.target.closest('.item, .c-container');
        const targetList = e.target.closest('.item-list');

        if (!targetList) return;

        if (targetElement && targetElement !== placeholder) {
            const rect = targetElement.getBoundingClientRect();
            const isCategory = targetElement.classList.contains('c-container');
            const draggedIsCategory = draggedElement.classList.contains('c-container');

            if (isCategory && !draggedIsCategory) {
                const innerList = targetElement.querySelector('.item-list');
                if (innerList && innerList.children.length === 0) {
                     innerList.appendChild(placeholder);
                     return;
                }
            }
            
            const midpoint = rect.top + rect.height / 2;
            if (e.clientY < midpoint) {
                targetElement.parentNode.insertBefore(placeholder, targetElement);
            } else {
                targetElement.parentNode.insertBefore(placeholder, targetElement.nextSibling);
            }
        } else if (!targetElement) {
            targetList.appendChild(placeholder);
        }
    }

    function handleDragLeave(e) {
        if (!e.currentTarget.contains(e.relatedTarget)) {
            placeholder.remove();
        }
    }

    function handleDrop(e) {
        e.preventDefault();
        if (!placeholder.parentNode) return;

        const parentList = placeholder.parentNode;
        const parentCategoryElement = parentList.closest('.c-container[data-type="category"]');
        const newParentId = parentCategoryElement ? parentCategoryElement.dataset.id : null;

        const children = Array.from(parentList.children).filter(child => !child.classList.contains('is-dragging'));
        const newIndex = children.indexOf(placeholder);

        MenuState.reorderItem(draggedId, newParentId, newIndex);

        placeholder.remove();
        if (draggedElement) {
            draggedElement.classList.remove('is-dragging');
        }

        
    }

    function handleDragEnd(e) {
        placeholder.remove();
        if (draggedElement) {
            draggedElement.classList.remove('is-dragging');
        }
        if (_onDragEndCallback) {
        _onDragEndCallback();
    }
    }

    return {
        init
    };
})();

export default DragDropManager;