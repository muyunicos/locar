/**
 * MenuApiService.js
 * * Módulo encargado de toda la comunicación con la API del backend.
 * * Debe ser inicializado con la configuración del cliente.
 */

// Configuración privada del módulo.
let config = {
    apiBaseUrl: ''
};

/**
 * Inicializa el servicio de API con las URLs necesarias.
 * Esta función DEBE ser llamada al inicio de la aplicación.
 * @param {object} initialConfig - Objeto con { apiBaseUrl: '...' }
 */
function init(initialConfig) {
    config.apiBaseUrl = initialConfig.apiBaseUrl;
}

/**
 * Guarda el estado actual del menú en el servidor.
 * @param {object} menuData - El objeto completo del menú a guardar.
 * @returns {Promise<object>} - La respuesta del servidor.
 */
async function saveMenu(menuData) {
    if (!config.apiBaseUrl) {
        throw new Error('MenuApiService no ha sido inicializado. Llama a init() primero.');
    }
    const url = `${config.apiBaseUrl}/saveMenu.php`;

    try {
        const response = await fetch(url, {
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
    init,
    saveMenu
};