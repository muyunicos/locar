let menu = null;

const generateUniqueId = () => '_' + Math.random().toString(36).substr(2, 9);

function findItemRecursive(id, itemsArray, parent = null) {
    for (let i = 0; i < itemsArray.length; i++) {
        const item = itemsArray[i];
        if (item.id === id) {
            return { item, parent, index: i };
        }
        if (item.items && item.items.length > 0) {
            const found = findItemRecursive(id, item.items, item);
            if (found) return found;
        }
    }
    return null;
}

function reorderItem(draggedId, targetId, position) {
    if (draggedId === targetId) return false;

    // 1. Encontrar y extraer el elemento arrastrado de su lugar original.
    const draggedResult = findItemRecursive(draggedId, menu.items);
    if (!draggedResult) return false;
    
    const draggedParentArray = draggedResult.parent ? draggedResult.parent.items : menu.items;
    const [draggedItem] = draggedParentArray.splice(draggedResult.index, 1);

    // 2. Encontrar la ubicación del elemento de destino.
    const targetResult = findItemRecursive(targetId, menu.items);
    if (!targetResult) {
        // Si no se encuentra el target, se devuelve el item a su lugar para no perderlo.
        draggedParentArray.splice(draggedResult.index, 0, draggedItem);
        return false;
    }
    
    const targetParentArray = targetResult.parent ? targetResult.parent.items : menu.items;
    
    // Recalculamos el índice del target por si el splice anterior afectó al mismo array.
    const targetIndex = targetParentArray.findIndex(item => item.id === targetId);

    // 3. Insertar el elemento arrastrado en la nueva posición.
    if (position === 'top') {
        targetParentArray.splice(targetIndex, 0, draggedItem);
    } else { // 'bottom'
        targetParentArray.splice(targetIndex + 1, 0, draggedItem);
    }

    return true;
}

function load(initialMenuData) {
    menu = JSON.parse(JSON.stringify(initialMenuData));
    const ensureIds = (items) => {
        if (!items) return;
        items.forEach(item => {
            if (!item.id) item.id = generateUniqueId();
            if (item.items) ensureIds(item.items);
        });
    };
    ensureIds(menu.items);
}

function getMenu() {
    if (!menu) return null;
    return JSON.parse(JSON.stringify(menu));
}

function updateItemProperty(id, property, value) {
    const result = findItemRecursive(id, menu.items);
    if (result) {
        result.item[property] = value;
        return true;
    }
    return false;
}

function toggleItemVisibility(id) {
    const result = findItemRecursive(id, menu.items);
    if (result) {
        result.item.ocultar = !result.item.ocultar;
        return true;
    }
    return false;
}

function deleteItem(id) {
    const result = findItemRecursive(id, menu.items);
    if (result) {
        const parentArray = result.parent ? result.parent.items : menu.items;
        parentArray.splice(result.index, 1);
        return true;
    }
    return false;
}

function duplicateItem(id) {
    const result = findItemRecursive(id, menu.items);
    if (!result) return false;
    const copia = JSON.parse(JSON.stringify(result.item));
    const assignNewIds = (item) => {
        item.id = generateUniqueId();
        if (item.items && item.items.length > 0) item.items.forEach(assignNewIds);
    };
    assignNewIds(copia);
    const parentArray = result.parent ? result.parent.items : menu.items;
    parentArray.splice(result.index + 1, 0, copia);
    return true;
}

function addItem(parentId, itemType) {
    const newItem = {
        id: generateUniqueId(),
        titulo: itemType === 'category' ? 'Nueva Categoría' : 'Nuevo Ítem',
        descripcion: '',
        ocultar: false,
    };
    if (itemType === 'category') {
        newItem.es_cat = true;
        newItem.items = [];
    } else {
        newItem.precio = '';
        newItem.imagen = '';
    }
    if (parentId) {
        const parentResult = findItemRecursive(parentId, menu.items);
        if (parentResult && parentResult.item.es_cat) {
            parentResult.item.items.push(newItem);
            return true;
        }
        return false;
    } else {
        menu.items.push(newItem);
        return true;
    }
}

export const MenuState = {
    load, getMenu, updateItemProperty, toggleItemVisibility,
    deleteItem, duplicateItem, addItem,
    reorderItem
};