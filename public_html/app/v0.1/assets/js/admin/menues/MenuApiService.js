

let config = {
    apiBaseUrl: ''
};

function init(initialConfig) {
    config.apiBaseUrl = initialConfig.apiBaseUrl;
}

async function saveMenu(payload) {
    if (!config.apiBaseUrl) {
        throw new Error('MenuApiService no ha sido inicializado. Llama a init() primero.');
    }
    const url = `${config.apiBaseUrl}/api/saveMenu.php`;

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(payload) 
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