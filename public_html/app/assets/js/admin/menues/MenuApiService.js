const MenuApiService = (function() {
    let apiUrl = '';
    let config = {};

    function init(appConfig) {
        config = appConfig;
        const basePath = config.publicUrl;
        const apiEndpoint = '/api/saveMenu.php';
        apiUrl = `${basePath}${apiEndpoint}`;
    }

    async function saveMenu(payload) {
        const menuContainerElement = document.querySelector('div[id^="menues-container"]');
        let dataSource = null;
        if (menuContainerElement) {
            const lastHyphenIndex = menuContainerElement.id.lastIndexOf('-');
            if (lastHyphenIndex !== -1) {
                dataSource = menuContainerElement.id.substring(lastHyphenIndex + 1) + '.json';
            } else {
                console.warn("El ID del elemento no contiene un guion para extraer 'yyy':", menuContainerElement.id);
            }
        } else {
            console.warn("No se encontró ningún div con ID que comience con 'menues-container'.");
        }
        
        const params = new URLSearchParams({
            client_id: config.clientId,
            url: config.clientUrl,
            dataSource: dataSource
        });
        
        if (config.version) {
            params.append('version', config.version);
        }
        
        const finalApiUrl = `${apiUrl}?${params.toString()}`;

        try {
            const response = await fetch(finalApiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify(payload)
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.message || `Error del servidor: ${response.status}`);
            }

            return result;

        } catch (error) {
            console.error('Error en MenuApiService.saveMenu:', error);
            throw error;
        }
    }

    return {
        init,
        saveMenu
    };
})();

export default MenuApiService;