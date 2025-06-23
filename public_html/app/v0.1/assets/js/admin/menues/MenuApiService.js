const MenuApiService = (function() {
    let apiUrl = '/app/v0.1/api/saveMenu.php'; // URL del endpoint de guardado

    async function saveMenu(payload) {
        try {
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            const result = await response.json();

            if (!response.ok) {
                // Si el servidor responde con un error (4xx, 5xx), lanzamos una excepción
                throw new Error(result.message || `Error del servidor: ${response.status}`);
            }

            return result; // Devuelve la respuesta exitosa (ej: { success: true, message: "..." })

        } catch (error) {
            // Captura errores de red o errores lanzados por nosotros
            console.error('Error en MenuApiService.saveMenu:', error);
            // Re-lanzamos el error para que sea capturado por el `catch` en admin-menues.js
            throw error;
        }
    }

    // La función init puede quedar por si en el futuro se necesita más configuración
    function init({}) {}

    return {
        init,
        saveMenu
    };
})();

export default MenuApiService;