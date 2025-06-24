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
        const params = new URLSearchParams({
            client_id: config.clientId,
            url: config.clientUrl
        });

        if (config.devId) {
            params.append('dev_branch', config.devId);
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