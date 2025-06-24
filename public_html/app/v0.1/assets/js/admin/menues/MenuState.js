const MenuState = (function() {
    let menu = {};
    let hasChanges = false;

    /**
     * Carga los datos iniciales del menú y reinicia el estado de cambios.
     * @param {object} initialMenuData - Los datos del menú a cargar.
     */
    function load(initialMenuData) {
        // Usamos una copia profunda para evitar mutaciones no deseadas del objeto original.
        menu = JSON.parse(JSON.stringify(initialMenuData));
        hasChanges = false;
    }

    /**
     * Devuelve el objeto de menú actual.
     * @returns {object} El menú.
     */
    function getMenu() {
        return menu;
    }

    /**
     * Busca un ítem (o categoría) de forma recursiva por su ID.
     * @param {string} id - El ID del ítem a buscar.
     * @param {Array} [currentItems=menu.items] - La lista de ítems donde buscar.
     * @param {object|null} [parent=null] - El padre del nivel actual.
     * @returns {{item: object, parent: object|null, index: number}|null} El ítem encontrado, su padre y su índice, o null.
     */
    function findItemRecursive(id, currentItems = menu.items, parent = null) {
        if (!currentItems) return null;
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

    /**
     * Actualiza una propiedad específica de un ítem.
     * @param {string} id - El ID del ítem a actualizar.
     * @param {string} property - El nombre de la propiedad a cambiar.
     * @param {*} value - El nuevo valor para la propiedad.
     */
    function updateItemProperty(id, property, value) {
        const found = findItemRecursive(id);
        if (found) {
            found.item[property] = value;
            hasChanges = true;
        }
    }
    
    /**
     * Actualiza una propiedad del nivel raíz del menú.
     * @param {string} key - La clave de la propiedad (ej. "titulo").
     * @param {string} value - El nuevo valor.
     */
    function updateMenuProperty(key, value) {
        if (menu && typeof menu === 'object') {
            menu[key] = value;
            hasChanges = true;
        }
    }

    /**
     * Elimina un ítem del menú.
     * @param {string} id - El ID del ítem a eliminar.
     */
    function deleteItem(id) {
        const found = findItemRecursive(id);
        if (found) {
            const list = found.parent ? found.parent.items : menu.items;
            list.splice(found.index, 1);
            hasChanges = true;
        }
    }
    
    /**
     * Genera un ID único para nuevos ítems.
     * @returns {string} Un ID único.
     */
    function generateId() {
        return 'item-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    }

    /**
     * Duplica un ítem, incluyendo sus hijos si es una categoría.
     * @param {string} id - El ID del ítem a duplicar.
     */
    function duplicateItem(id) {
        const found = findItemRecursive(id);
        if (found) {
            const list = found.parent ? found.parent.items : menu.items;
            const originalItem = found.item;
            
            const newItem = JSON.parse(JSON.stringify(originalItem));
            
            // Asigna nuevos IDs a todos los elementos duplicados de forma recursiva.
            const assignNewIds = (item) => {
                item.id = generateId();
                if (item.items) {
                    item.items.forEach(assignNewIds);
                }
            };
            assignNewIds(newItem);

            list.splice(found.index + 1, 0, newItem);
            hasChanges = true;
        }
    }
    
    /**
     * Cambia la propiedad 'ocultar' de un ítem.
     * @param {string} id - El ID del ítem a modificar.
     */
    function toggleVisibility(id) {
        const found = findItemRecursive(id);
        if (found) {
            found.item.ocultar = !found.item.ocultar;
            hasChanges = true;
        }
    }

    /**
     * Reordena un ítem, moviéndolo a una nueva posición o a un nuevo padre.
     * @param {string} draggedId - El ID del ítem que se arrastró.
     * @param {string|null} newParentId - El ID del nuevo padre (o null si es raíz).
     * @param {number} newIndex - El nuevo índice dentro de la lista de destino.
     */
    function reorderItem(draggedId, newParentId, newIndex) {
        const { item: draggedItem, parent: originalParent, index: originalIndex } = findItemRecursive(draggedId);
        if (!draggedItem) return;

        // 1. Eliminar de la posición original
        const sourceList = originalParent ? originalParent.items : menu.items;
        sourceList.splice(originalIndex, 1);

        // 2. Encontrar la lista de destino
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

        // 3. Insertar en la nueva posición
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
        reorderItem,
        toggleVisibility,
        setChanges: (state) => { hasChanges = state; },
        getChanges: () => hasChanges
    };
})();

export default MenuState;