let _menuState = null;
let _menuView = null;
let _mainContainer = null;
let _deactivateCurrentItemCallback = null;

let placeholder = null;
let draggedId = null;
let isDragging = false;

function init(dependencies) {
    _menuState = dependencies.menuState;
    _menuView = dependencies.menuView;
    _mainContainer = dependencies.mainContainer;
    _deactivateCurrentItemCallback = dependencies.deactivateCurrentItemCallback;

    if (!_mainContainer) {
        console.error("FATAL: DragDropManager necesita #item-list-container para inicializarse.");
        return;
    }

    _mainContainer.addEventListener('dragstart', handleDragStart);
    document.addEventListener('dragend', handleDragEnd);
    document.addEventListener('dragover', handleDragOver);
    document.addEventListener('drop', handleDrop);

    console.log('[LOG] DragDropManager inicializado y listeners de D&D registrados.');
}

function handleDragStart(e) {
    const dragHandle = e.target.closest('.item-drag-handle');
    const draggedElement = e.target.closest('.item, .c-container');
    if (!_deactivateCurrentItemCallback || draggedElement !== _deactivateCurrentItemCallback.getActiveItem() || !dragHandle) {
        console.log('[LOG] DragDropManager: dragstart ignorado. No hay ítem activo, el drag no es del ítem activo, o no es desde su manija.');
        e.preventDefault(); 
        return; 
    }
    
    isDragging = true; 
    draggedId = draggedElement.dataset.id;
    e.dataTransfer.setData('text/plain', draggedId); 
    e.dataTransfer.effectAllowed = 'move'; 
    
    placeholder = document.createElement('div'); 
    placeholder.className = 'drop-placeholder'; 
    placeholder.style.height = `${draggedElement.offsetHeight}px`; 

    setTimeout(() => draggedElement.classList.add('is-dragging'), 0);
    console.log(`[LOG] DragDropManager: dragstart INICIADO para el ID: ${draggedId}`); 
}

function handleDragOver(e) {
    e.preventDefault();
    const target = e.target.closest('.item-list, .c-container[data-type="category"], .item, .c-container'); 

    if (!target || draggedId === null) return; 

    const activeItemFromMain = _deactivateCurrentItemCallback.getActiveItem();
    if (!activeItemFromMain) return;

    if (target.classList.contains('item-list')) {
        if (target.children.length === 0 || target.contains(placeholder)) { 
            if (!target.contains(placeholder)) { 
                target.appendChild(placeholder); 
            }
        } else {
            const children = Array.from(target.children).filter(child => child !== activeItemFromMain && child !== placeholder); 
            let foundSpot = false;
            for (let i = 0; i < children.length; i++) { 
                const child = children[i]; 
                const rect = child.getBoundingClientRect();
                if (e.clientY < rect.top + rect.height / 2) { 
                    target.insertBefore(placeholder, child); 
                    foundSpot = true; 
                    break; 
                }
            }
            if (!foundSpot && !target.contains(placeholder)) { 
                target.appendChild(placeholder); 
            }
        }
    } else if (target.classList.contains('item') || target.classList.contains('c-container')) { 
        const rect = target.getBoundingClientRect(); 
        const after = e.clientY >= (rect.top + rect.height / 2); 

        if (target.dataset.id === draggedId) return; 

        if (target.classList.contains('c-container') && target.dataset.type === 'category') { 
            const categoryList = target.querySelector('.item-list');
            if (activeItemFromMain.dataset.type === 'category' && e.clientY > rect.top + rect.height * 0.25 && e.clientY < rect.top + rect.height * 0.75) { 
                if (categoryList && !categoryList.contains(placeholder)) { 
                    categoryList.prepend(placeholder); 
                }
            } else { 
                target.parentNode.insertBefore(placeholder, after ? target.nextSibling : target); 
            }
        } else {
            target.parentNode.insertBefore(placeholder, after ? target.nextSibling : target); 
        }
    }
}

function handleDrop(e) {
    e.preventDefault(); 
    if (!placeholder || !placeholder.parentNode || draggedId === null) {
        console.warn('[WARN] DragDropManager: Drop ignorado. Placeholder, padre o ID arrastrado nulo.');
        return; 
    }
    
    const parentList = placeholder.parentNode; 
    const parentCategoryElement = parentList.closest('.c-container[data-type="category"]'); 
    const newParentId = parentCategoryElement ? parentCategoryElement.dataset.id : null; 
    
    let finalIndex = Array.from(parentList.children).indexOf(placeholder); 

    const success = _menuState.reorderItem(draggedId, newParentId, finalIndex); 
    if(success) { 
        _menuView.setSaveChangesVisible(true);
        console.log(`[LOG] DragDropManager: Ítem ID ${draggedId} reordenado con éxito.`);
    } else { 
        console.warn('[WARN] DragDropManager: No se pudo reordenar el ítem en el estado.'); 
    }
}

function handleDragEnd(e) {
    const activeItemFromMain = _deactivateCurrentItemCallback.getActiveItem();
    if(activeItemFromMain) activeItemFromMain.classList.remove('is-dragging'); 
    if (placeholder && placeholder.parentNode) { 
        placeholder.parentNode.removeChild(placeholder); 
    }
    draggedId = null; 
    placeholder = null; 
    isDragging = false; 

    _menuView.render(_menuState.getMenu()); 

    console.log('[LOG] DragDropManager: Arrastre finalizado.');
}

export const DragDropManager = { 
    init, 
    isDragging: () => isDragging
};