<?php
require_once __DIR__ . '/api_bootstrap.php';
use Core\View;
use Core\EventManager;
use Core\Utils;
use Core\ModuleLoader;
use Admin\AuthManager; 

$authManager = new AuthManager();
$isAdmin = $authManager->isLoggedIn();

$moduleId = $_GET["id"] ?? "";

if (
    !preg_match('/^[a-zA-Z0-9_-]+$/', CLIENT_ID) ||
    !preg_match('/^[a-zA-Z0-9_-]+$/', $moduleId)
) {
    send_json_response(false, "Error: ID de cliente o módulo inválido.", null, 400);
}

$manifestPath = CLIENT_PATH . "/datos/manifest.json";
if (!file_exists($manifestPath)) {
    send_json_response(false, "Error: Manifiesto no encontrado para el cliente.", null, 404);
}
$manifest = json_decode(file_get_contents($manifestPath), true);
if (json_last_error() !== JSON_ERROR_NONE) {
    send_json_response(false, "Error al decodificar el manifiesto: " . json_last_error_msg(), null, 500);
}

try {
    $eventManager = new EventManager($manifest["eventos"] ?? []);
    $activeEventContext = $eventManager->getContext();
    $moduleLoader = new ModuleLoader($manifest, $activeEventContext);
    $moduleResult = $moduleLoader->loadById($moduleId, $isAdmin);

    if ($moduleResult['error']) {    
        send_json_response(false, "Error al cargar el módulo.", ["html" => $moduleResult['html']], 404);
    }

    $allCss = $moduleResult['css'] ?? [];
    $allJs = $moduleResult['js'] ?? [];
    $mainCssUrl = null;

    if ($moduleResult['main_skin_override']) {
        $mainCssUrl = PUBLIC_URL . "/assets/css/" . $moduleResult['skin'] . "/main.css";
    }

    $responseData = [
        "html" => $moduleResult['html'],
        "css" => $allCss,
        "js" => $allJs,
        "main_css_url" => $mainCssUrl,
        "sufijo" => $moduleResult['sufijo'],
        "module_type" => $moduleResult['type'] ?? null, 
    ];

    send_json_response(true, "Módulo cargado exitosamente.", $responseData);

} catch (Exception $e) {
    error_log("Error en getModule.php: " . $e->getMessage());
    send_json_response(
        false,
        "Ocurrió un error en el servidor al cargar el módulo.",
        DEV ? ["details" => $e->getMessage(), "file" => $e->getFile(), "line" => $e->getLine()] : null,
        500
    );
}
?>