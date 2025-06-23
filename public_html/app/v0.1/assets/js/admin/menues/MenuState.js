const MenuState = (function() {
    let menu = {};
    let hasChanges = false;

    function load(initialMenuData) {
        menu = JSON.parse(JSON.stringify(initialMenuData));
        hasChanges = false;
    }

    function getMenu() {
        return menu;
    }

    function findItemRecursive(id, currentItems = menu.items, parent = null) {
        for (let i = 0; i < currentItems.length; i++) {
            const item = currentItems[i];
            if (item.id === id) {
                return { item, parent, index: i };
            }
            if (item.items && item.items.length > 0) {
                const found = findItemRecursive(id, item.items, item);
                if (found) {
                    return found;
                }
            }
        }
        return null;
    }

    function updateItemProperty(id, property, value) {
        const found = findItemRecursive(id);
        if (found) {
            found.item[property] = value;
            hasChanges = true;
        }
    }
    
    function updateMenuProperty(key, value) {
        if (menu && typeof menu === 'object') {
            menu[key] = value;
            hasChanges = true;
        }
    }

    function deleteItem(id) {
        const found = findItemRecursive(id);
        if (found) {
            const list = found.parent ? found.parent.items : menu.items;
            list.splice(found.index, 1);
            hasChanges = true;
        }
    }
    
    function generateId() {
        return 'item-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    }

    function duplicateItem(id) {
        const found = findItemRecursive(id);
        if (found) {
            const list = found.parent ? found.parent.items : menu.items;
            const originalItem = found.item;
            
            const newItem = JSON.parse(JSON.stringify(originalItem));
            newItem.id = generateId();
            
            if (newItem.type === 'category' && newItem.items) {
                const assignNewIds = (items) => {
                    items.forEach(item => {
                        item.id = generateId();
                        if (item.type === 'category' && item.items) {
                            assignNewIds(item.items);
                        }
                    });
                };
                assignNewIds(newItem.items);
            }

            list.splice(found.index + 1, 0, newItem);
            hasChanges = true;
        }
    }

    function addItem(parentId, itemData) {
        const newId = generateId();
        const newItem = { id: newId, ...itemData };
        
        if (parentId) {
            const foundParent = findItemRecursive(parentId);
            if (foundParent && foundParent.item.type === 'category') {
                if (!foundParent.item.items) {
                    foundParent.item.items = [];
                }
                foundParent.item.items.push(newItem);
            }
        } else {
            if (!menu.items) {
                menu.items = [];
            }
            menu.items.push(newItem);
        }
        hasChanges = true;
    }
    
    function reorderItem(draggedId, newParentId, newIndex) {
        const found = findItemRecursive(draggedId);
        if (!found) return;

        const { item: draggedItem, parent: originalParent, index: originalIndex } = found;
        const originalParentId = originalParent ? originalParent.id : null;

        const sourceList = originalParent ? originalParent.items : menu.items;
        sourceList.splice(originalIndex, 1);
        
        let destinationList;
        if (newParentId) {
            const newParentInfo = findItemRecursive(newParentId);
            if (!newParentInfo || newParentInfo.item.type !== 'category') return; 
            if (!newParentInfo.item.items) {
                newParentInfo.item.items = [];
            }
            destinationList = newParentInfo.item.items;
        } else {
            destinationList = menu.items;
        }

        if (originalParentId === newParentId && originalIndex < newIndex) {
            newIndex--;
        }

        destinationList.splice(newIndex, 0, draggedItem);
        hasChanges = true;
    }

    return {
        load,
        getMenu,
        updateItemProperty,
        updateMenuProperty,
        deleteItem,
        duplicateItem,
        addItem,
        reorderItem
    };
})();

export default MenuState;