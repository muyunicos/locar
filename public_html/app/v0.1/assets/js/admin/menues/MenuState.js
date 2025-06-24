const MenuState = (function() {
    let menu = {};
    let hasChanges = false;

    function _logState(action) {
        console.groupCollapsed(`[MenuState] Estado actualizado después de: "${action}"`);
        console.log("Objeto del Menú Completo:", JSON.parse(JSON.stringify(menu)));
        console.groupEnd();
    }

    function load(initialMenuData) {
        menu = JSON.parse(JSON.stringify(initialMenuData));
        hasChanges = false;
        console.log("[MenuState] Estado inicial cargado.");
    }

    function getMenu() {
        return menu;
    }

    function findItemRecursive(id, currentItems = menu.items, parent = null) {
        if (!currentItems) return null;
        for (let i = 0; i < currentItems.length; i++) {
            const item = currentItems[i];
            
            // === INICIO DE LA CORRECCIÓN FINAL ===
            // Comparamos ambos valores como texto para evitar problemas de tipos (número vs. texto).
            if (String(item.id) === String(id)) {
                return { item, parent, index: i };
            }
            // === FIN DE LA CORRECCIÓN FINAL ===
            
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
            _logState(`updateItemProperty: ${property}`);
        }
    }
    
    function updateMenuProperty(key, value) {
        if (menu && typeof menu === 'object') {
            menu[key] = value;
            hasChanges = true;
            _logState(`updateMenuProperty: ${key}`);
        }
    }

    function deleteItem(id) {
        const found = findItemRecursive(id);
        if (found) {
            const list = found.parent ? found.parent.items : menu.items;
            list.splice(found.index, 1);
            hasChanges = true;
            _logState("deleteItem");
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
            
            const assignNewIds = (item) => {
                item.id = generateId();
                if (item.items) {
                    item.items.forEach(assignNewIds);
                }
            };
            assignNewIds(newItem);

            list.splice(found.index + 1, 0, newItem);
            hasChanges = true;
            _logState("duplicateItem");
        }
    }
    
    function toggleVisibility(id) {
        const found = findItemRecursive(id);
        if (found) {
            found.item.ocultar = !found.item.ocultar;
            hasChanges = true;
            _logState("toggleVisibility");
        }
    }

    function reorderItem(draggedId, newParentId, newIndex) {
        const found = findItemRecursive(draggedId);
        if (!found) return;
        
        const { item: draggedItem, parent: originalParent, index: originalIndex } = found;

        const sourceList = originalParent ? originalParent.items : menu.items;
        sourceList.splice(originalIndex, 1);

        let destinationList;
        if (newParentId) {
            const newParentInfo = findItemRecursive(newParentId);
            if (!newParentInfo || (newParentInfo.item.type !== 'category' && !newParentInfo.item.es_cat)) return;
            if (!newParentInfo.item.items) {
                newParentInfo.item.items = [];
            }
            destinationList = newParentInfo.item.items;
        } else {
            destinationList = menu.items;
        }

        destinationList.splice(newIndex, 0, draggedItem);
        hasChanges = true;
        _logState("reorderItem");
    }

    return {
        load,
        getMenu,
        updateItemProperty,
        updateMenuProperty,
        deleteItem,
        duplicateItem,
        reorderItem,
        toggleVisibility,
        setChanges: (state) => { hasChanges = state; },
        getChanges: () => hasChanges
    };
})();

export default MenuState;