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

    function updateItemImage(itemId, imageName) {
    const item = this.findItemById(this.items, itemId);
    if (item) {
        item.imagen = imageName;
        this.renderMenu();
        this.showSaveButton();
    }
}
    function findItemRecursive(id, currentItems = menu.items, parent = null) {
        if (!currentItems) return null;
        for (let i = 0; i < currentItems.length; i++) {
            const item = currentItems[i];
            
            if (String(item.id) === String(id)) {
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
        if (property === 'imagen') {
            value = value.replace(/\.(webp|jpg|jpeg|png|gif)$/i, '');
        }
        found.item[property] = value;
        hasChanges = true;
        _logState(`updateItemProperty: ${property} para el ítem ${id}`);
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
// --- Añade esta función dentro de MenuState ---
    /**
     * Crea un nuevo ítem con valores por defecto.
     * @param {string|null} parentId - El ID de la categoría padre, o null para añadirlo a la raíz.
     */
    function createItem(parentId = null) {
        const newItem = {
            id: generateId(), // Reutilizamos tu función para generar IDs
            titulo: "Nuevo Ítem",
            descripcion: "",
            precio: 0,
            imagen: "",
            ocultar: false,
            es_cat: false // Importante para distinguirlo de una categoría
        };

        let destinationList;

        if (parentId) {
            // Si se especifica un padre, buscamos su lista de ítems
            const parentInfo = findItemRecursive(parentId);
            if (parentInfo && parentInfo.item) {
                if (!parentInfo.item.items) {
                    parentInfo.item.items = []; // Si no tiene una lista de hijos, la creamos
                }
                destinationList = parentInfo.item.items;
            } else {
                console.error(`No se encontró la categoría padre con ID: ${parentId}`);
                return; // Salimos si no encontramos al padre
            }
        } else {
            // Si no hay padre, lo añadimos a la lista principal del menú
            destinationList = menu.items;
        }

        destinationList.push(newItem); // Añadimos el nuevo ítem a la lista de destino
        hasChanges = true;
        _logState(`createItem en padre: ${parentId || 'raíz'}`);
    }

    // --- Añade también esta función ---
    /**
     * Crea una nueva categoría con valores por defecto.
     * @param {string|null} parentId - El ID de la categoría padre, o null para añadirla a la raíz.
     */
    function createCategory(parentId = null) {
        const newCategory = {
            id: generateId(),
            titulo: "Nueva Categoría",
            descripcion: "",
            imagen: "",
            ocultar: false,
            es_cat: true, // La clave para identificarla como categoría
            items: [] // Las categorías siempre empiezan con una lista de ítems vacía
        };

        let destinationList;

        if (parentId) {
            const parentInfo = findItemRecursive(parentId);
            if (parentInfo && parentInfo.item) {
                if (!parentInfo.item.items) {
                    parentInfo.item.items = [];
                }
                destinationList = parentInfo.item.items;
            } else {
                console.error(`No se encontró la categoría padre con ID: ${parentId}`);
                return;
            }
        } else {
            destinationList = menu.items;
        }

        destinationList.push(newCategory);
        hasChanges = true;
        _logState(`createCategory en padre: ${parentId || 'raíz'}`);
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
        getChanges: () => hasChanges,

        createItem,
        createCategory
    };
})();
export default MenuState;