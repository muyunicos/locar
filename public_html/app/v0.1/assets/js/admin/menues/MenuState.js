/**
 * MenuState.js
 * * Módulo para la gestión del estado del menú.
 * Encapsula el objeto del menú y provee métodos seguros para su manipulación.
 * Es la "única fuente de verdad" para los datos del menú.
 */

// Estado privado del módulo. Nadie de afuera puede acceder a 'menu' directamente.
let menu = null;

// --- Funciones de Ayuda Internas ---

/**
 * Genera un ID único para nuevos ítems.
 * @returns {string}
 */
const generateUniqueId = () => '_' + Math.random().toString(36).substr(2, 9);

/**
 * Busca de forma recursiva un ítem (o categoría) por su ID en un array de ítems.
 * @param {string} id - El ID del ítem a buscar.
 * @param {Array} itemsArray - El array donde buscar (ej. menu.items).
 * @returns {{item: object, parent: object, index: number}|null} - El ítem, su padre y su índice, o null si no se encuentra.
 */
function findItemRecursive(id, itemsArray, parent = null) {
    for (let i = 0; i < itemsArray.length; i++) {
        const item = itemsArray[i];
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

// --- Funciones Públicas Exportadas ---

/**
 * Inicializa el estado con los datos del menú.
 * Asegura que todos los ítems tengan un ID único.
 * @param {object} initialMenuData 
 */
function load(initialMenuData) {
    // Hacemos una copia profunda para evitar mutaciones inesperadas del objeto original.
    menu = JSON.parse(JSON.stringify(initialMenuData));

    // Aseguramos que todos los ítems y categorías tengan un ID.
    // Esto es CRUCIAL para poder manipularlos de forma fiable.
    const ensureIds = (items) => {
        if (!items) return;
        items.forEach(item => {
            if (!item.id) {
                item.id = generateUniqueId();
            }
            if (item.items) {
                ensureIds(item.items);
            }
        });
    };

    ensureIds(menu.items);
}

/**
 * Devuelve una copia profunda del estado actual del menú.
 * Previene que el estado sea modificado accidentalmente desde afuera.
 * @returns {object}
 */
function getMenu() {
    if (!menu) return null;
    return JSON.parse(JSON.stringify(menu));
}

/**
 * Actualiza una propiedad específica de un ítem.
 * @param {string} id - ID del ítem a modificar.
 * @param {string} property - Nombre de la propiedad (ej. 'titulo', 'precio').
 * @param {any} value - Nuevo valor.
 * @returns {boolean} - true si tuvo éxito, false si no.
 */
function updateItemProperty(id, property, value) {
    const result = findItemRecursive(id, menu.items);
    if (result) {
        result.item[property] = value;
        return true;
    }
    return false;
}

/**
 * Elimina un ítem o categoría del menú.
 * @param {string} id - ID del ítem a eliminar.
 * @returns {boolean} - true si tuvo éxito, false si no.
 */
function deleteItem(id) {
    const result = findItemRecursive(id, menu.items);
    if (result) {
        const parentArray = result.parent ? result.parent.items : menu.items;
        parentArray.splice(result.index, 1);
        return true;
    }
    return false;
}

// Aquí añadiremos más funciones en el futuro (duplicar, añadir, reordenar...)

export const MenuState = {
    load,
    getMenu,
    updateItemProperty,
    deleteItem
};


const API_ENDPOINT = '/app/v0.1/api/saveMenu.php';

async function saveMenu(menuData, clientName) {
    const url = `/${clientName}/api/saveMenu.php`;
    try {
        const response = await fetch(API_ENDPOINT, { 
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(menuData)
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => null);
            throw new Error(errorData?.message || `Error del servidor: ${response.status}`);
        }

        return await response.json();

    } catch (error) {
        console.error('Error al guardar el menú:', error);
        throw error;
    }
}

export const MenuApiService = {
    saveMenu
};

// AÑADE ESTAS DOS FUNCIONES DENTRO DE TU ARCHIVO MenuState.js
// (Puedes ponerlas después de la función deleteItem)

/**
 * Duplica un ítem o categoría, asignando nuevos IDs a los elementos duplicados.
 * @param {string} id - ID del ítem a duplicar.
 * @returns {boolean} - true si tuvo éxito.
 */
function duplicateItem(id) {
    const result = findItemRecursive(id, menu.items);
    if (!result) return false;

    // 1. Crear una copia profunda del ítem.
    const aClonar = result.item;
    const copia = JSON.parse(JSON.stringify(aClonar));

    // 2. Función recursiva para asignar nuevos IDs a la copia y a todos sus hijos.
    const assignNewIds = (item) => {
        item.id = generateUniqueId();
        if (item.items && item.items.length > 0) {
            item.items.forEach(assignNewIds);
        }
    };
    assignNewIds(copia);

    // 3. Insertar la copia en el array del padre, justo después del original.
    const parentArray = result.parent ? result.parent.items : menu.items;
    parentArray.splice(result.index + 1, 0, copia);
    
    return true;
}

/**
 * Añade un nuevo ítem o categoría dentro de un padre.
 * @param {string|null} parentId - ID de la categoría padre, o null para añadir a la raíz.
 * @param {string} itemType - 'item' o 'category'.
 * @returns {boolean} - true si tuvo éxito.
 */
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
        // Añadir dentro de una categoría existente
        const parentResult = findItemRecursive(parentId, menu.items);
        if (parentResult && parentResult.item.es_cat) {
            parentResult.item.items.push(newItem);
            return true;
        }
        return false; // No se encontró el padre o no era una categoría
    } else {
        // Añadir al nivel raíz del menú
        menu.items.push(newItem);
        return true;
    }
}


// AHORA, ACTUALIZA EL BLOQUE 'export' AL FINAL DEL ARCHIVO PARA INCLUIR LAS NUEVAS FUNCIONES:

export const MenuState = {
    load,
    getMenu,
    updateItemProperty,
    deleteItem,
    duplicateItem, // <--- añadir esta línea
    addItem        // <--- añadir esta línea
};