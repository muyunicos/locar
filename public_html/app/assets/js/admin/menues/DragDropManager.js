import MenuState from './MenuState.js';

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
        placeholder.className = 'drop-placeholder';
    }

    // === INICIO DE LA CORRECCIÓN ===
    function handleDragStart(e) {
        // Primero, verificamos si el arrastre se inició sobre el manejador.
        // e.target es el elemento exacto donde se hizo clic (puede ser el SVG o su contenedor).
        const dragHandle = e.target.closest('.item-drag-handle');

        // Si el arrastre no comenzó en el manejador, lo prevenimos por completo.
        if (!dragHandle) {
            e.preventDefault();
            return;
        }

        // Si el arrastre es válido, ahora sí buscamos el contenedor principal que se puede arrastrar.
        draggedElement = e.target.closest('.item, .c-container');
        if (!draggedElement) return; // Salida de seguridad adicional

        // Guardamos el ID del elemento arrastrado.
        draggedId = draggedElement.dataset.id;
        e.dataTransfer.setData('text/plain', draggedId);
        e.dataTransfer.effectAllowed = 'move';

        // Usamos un pequeño retraso para que el navegador "fotografíe" el elemento
        // antes de que le apliquemos el estilo de arrastre.
        setTimeout(() => {
            if (draggedElement) {
                draggedElement.classList.add('is-dragging');
            }
        }, 0);
    }
    // === FIN DE LA CORRECCIÓN ===

    function handleDragOver(e) {
        e.preventDefault();
        
        // Si por alguna razón no hay un elemento arrastrándose, no hacemos nada.
        // Esto previene el segundo error (Cannot read properties of null).
        if (!draggedElement) return;

        e.dataTransfer.dropEffect = 'move';

        const targetElement = e.target.closest('.item, .c-container');
        const targetList = e.target.closest('.item-list');

        if (!targetList) return;

        // Evita que un ítem se pueda soltar dentro de sí mismo.
        if (targetElement === draggedElement) return;

        if (targetElement && targetElement !== placeholder) {
            const rect = targetElement.getBoundingClientRect();
            const midpoint = rect.top + rect.height / 2;
            
            // Lógica para categorías (un ítem puede entrar en una categoría vacía)
            const isTargetCategory = targetElement.classList.contains('c-container');
            const isDraggedCategory = draggedElement.classList.contains('c-container');
            if (isTargetCategory && !isDraggedCategory) {
                const innerList = targetElement.querySelector('.item-list');
                // Si el cursor está sobre una categoría y se mantiene un momento,
                // se podría expandir para soltar dentro (lógica futura).
                // Por ahora, solo permitimos soltar antes o después.
            }

            if (e.clientY < midpoint) {
                targetElement.parentNode.insertBefore(placeholder, targetElement);
            } else {
                targetElement.parentNode.insertBefore(placeholder, targetElement.nextSibling);
            }
        } else if (!targetElement && !targetList.querySelector('.item, .c-container')) {
             // Si la lista está vacía, permite soltar al final.
            targetList.appendChild(placeholder);
        }
    }

    function handleDragLeave(e) {
        // Solo removemos el placeholder si el cursor sale del área del contenedor.
        if (placeholder.parentNode && !e.currentTarget.contains(e.relatedTarget)) {
            placeholder.remove();
        }
    }

    function handleDrop(e) {
        e.preventDefault();
        // Si no hay un placeholder visible, significa que no es una zona de soltado válida.
        if (!placeholder.parentNode) return;

        const parentList = placeholder.parentNode;
        const parentCategoryElement = parentList.closest('.c-container');
        const newParentId = parentCategoryElement ? parentCategoryElement.dataset.id : null;

        // Calculamos el nuevo índice basándonos en la posición del placeholder.
        const children = Array.from(parentList.children);
        const newIndex = children.indexOf(placeholder);

        // Actualizamos el estado con la nueva posición.
        MenuState.reorderItem(draggedId, newParentId, newIndex);

        // Limpiamos el placeholder. El re-renderizado se hará en handleDragEnd.
        placeholder.remove();
    }

    function handleDragEnd(e) {
        // Limpieza final sin importar dónde se soltó.
        placeholder.remove();
        if (draggedElement) {
            draggedElement.classList.remove('is-dragging');
        }
        
        // Reiniciamos las variables de estado del arrastre.
        draggedElement = null;
        draggedId = null;

        // Llamamos al callback para que el controlador principal (admin-menues.js)
        // sepa que debe re-renderizar la vista para mostrar el nuevo orden.
        if (_onDragEndCallback) {
            _onDragEndCallback();
        }
    }

    return {
        init
    };
})();

export default DragDropManager;