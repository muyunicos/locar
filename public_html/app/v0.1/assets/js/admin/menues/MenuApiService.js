const MenuApiService = (function() {
    let apiConfig = {};
    let callbacks = {};

    function init(options) {
        const config = window.locarConfig || {};
        
        apiConfig = {
            saveUrl: `${config.publicUrl}/api/saveMenu.php`
        };
        
        callbacks = {
            onStart: options.onStart || (() => {}),
            onSuccess: options.onSuccess || (() => {}),
            onError: options.onError || (() => {}),
            onComplete: options.onComplete || (() => {}),
        };
    }

    function saveMenu(payload) {
        callbacks.onStart();

        fetch(apiConfig.saveUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(payload)
        })
        .then(response => {
            if (!response.ok) {
                return response.json().then(err => { 
                    throw new Error(err.message || 'Error en el servidor. Código: ' + response.status);
                }).catch(() => {
                    throw new Error('Error en la comunicación con el servidor. Código: ' + response.status);
                });
            }
            return response.json();
        })
        .then(data => {
            if (data.success) {
                callbacks.onSuccess(data);
            } else {
                throw new Error(data.message || 'Ocurrió un error desconocido al guardar.');
            }
        })
        .catch(error => {
            callbacks.onError(error.message);
        })
        .finally(() => {
            callbacks.onComplete();
        });
    }

    return {
        init,
        saveMenu
    };
})();

export default MenuApiService;