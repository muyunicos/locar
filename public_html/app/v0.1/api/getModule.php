<?php
// 1. --- BOOTSTRAP: Carga el núcleo de la aplicación y las configuraciones ---
require_once __DIR__ . '/api_bootstrap.php';

// Importación de las clases que se utilizarán.
use Core\EventManager;
use Core\ModuleLoader;

// 2. --- AUTENTICACIÓN: Verificamos si el que pide el módulo es un administrador ---
// Usamos el namespace completo '\Admin\AuthManager' para ser consistentes y evitar ambigüedades.
$authManager = new \Admin\AuthManager();
$isAdmin = $authManager->isLoggedIn();

// 3. --- VALIDACIÓN DE ENTRADA: Recogemos y validamos los parámetros de la URL ---
$moduleId = $_GET["id"] ?? "";

// Validamos que los IDs de cliente y módulo tengan un formato seguro.
if (
    !preg_match('/^[a-zA-Z0-9_-]+$/', CLIENT_ID) ||
    !preg_match('/^[a-zA-Z0-9_-]+$/', $moduleId)
) {
    send_json_response(false, "Error: ID de cliente o de módulo inválido.", null, 400);
}

// 4. --- CARGA DEL MANIFIESTO: Leemos la configuración principal del cliente ---
$manifestPath = CLIENT_PATH . "/datos/manifest.json";

if (!file_exists($manifestPath)) {
    send_json_response(false, "Error de configuración: No se encontró el archivo manifest.json del cliente.", null, 404);
}
$manifest = json_decode(file_get_contents($manifestPath), true);
if (json_last_error() !== JSON_ERROR_NONE) {
    send_json_response(false, "Error de sintaxis en el archivo manifest.json: " . json_last_error_msg(), null, 500);
}

// 5. --- LÓGICA PRINCIPAL: Cargamos el módulo solicitado ---
try {
    // Se inicializan los gestores de eventos y de módulos.
    $eventManager = new EventManager($manifest["eventos"] ?? []);
    $activeEventContext = $eventManager->getContext();
    $moduleLoader = new ModuleLoader($manifest, $activeEventContext);
    
    // El cargador de módulos hace el trabajo de obtener los datos, el HTML y los assets.
    $moduleResult = $moduleLoader->loadById($moduleId, $isAdmin);

    // Si el cargador reportó un error, lo enviamos como respuesta.
    if ($moduleResult['error']) {    
        send_json_response(false, "No se pudo cargar el módulo solicitado.", ["html" => $moduleResult['html']], 404);
    }

    // 6. --- PREPARACIÓN DE LA RESPUESTA: Construimos el objeto JSON para el frontend ---
    $mainCssUrl = null;
    if ($moduleResult['main_skin_override'] && !empty($moduleResult['skin'])) {
        $mainCssUrl = PUBLIC_URL . "/assets/css/" . $moduleResult['skin'] . "/main.css";
    }

    // El objeto que recibirá el JavaScript con todo lo necesario para actualizar la página.
    $responseData = [
        "html" => $moduleResult['html'],
        "css" => $moduleResult['css'] ?? [],
        "js" => $moduleResult['js'] ?? [],
        "main_css_url" => $mainCssUrl,
        "sufijo" => $moduleResult['sufijo'] ?? null,
        "module_type" => $moduleResult['type'] ?? null, 
    ];

    send_json_response(true, "Módulo cargado exitosamente.", $responseData);

} catch (Exception $e) {
    // Capturamos cualquier error inesperado para evitar que la aplicación se rompa.
    error_log("Error fatal en getModule.php: " . $e->getMessage());
    send_json_response(
        false,
        "Ocurrió un error inesperado en el servidor.",
        // En modo desarrollo, enviamos los detalles del error para facilitar la depuración.
        (defined('DEV') && DEV) ? ["details" => $e->getMessage(), "file" => $e->getFile(), "line" => $e->getLine()] : null,
        500
    );
}
?>