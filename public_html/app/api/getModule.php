<?php
require_once __DIR__ . '/api_bootstrap.php';

use Core\EventManager;
use Core\ModuleLoader;

$authManager = new \Admin\AuthManager();
$isAdmin = $authManager->isLoggedIn();

$moduleId = $_GET["id"] ?? "";

if (
    !preg_match('/^[a-zA-Z0-9_-]+$/', CLIENT_ID) ||
    !preg_match('/^[a-zA-Z0-9_-]+$/', $moduleId)
) {
    send_json_response(false, "Error: ID de cliente o de módulo inválido.", null, 400);
}

$manifestPath = CLIENT_PATH . "/datos/manifest.json";

if (!file_exists($manifestPath)) {
    send_json_response(false, "Error de configuración: No se encontró el archivo manifest.json del cliente.", null, 404);
}
$manifest = json_decode(file_get_contents($manifestPath), true);
if (json_last_error() !== JSON_ERROR_NONE) {
    send_json_response(false, "Error de sintaxis en el archivo manifest.json: " . json_last_error_msg(), null, 500);
}

try {
    $eventManager = new EventManager($manifest["eventos"] ?? []);
    $activeEventContext = $eventManager->getContext();
    $moduleLoader = new ModuleLoader($manifest, $activeEventContext);
    
    $moduleResult = $moduleLoader->loadById($moduleId, $isAdmin, IS_ADMIN_URL);

    if ($moduleResult['error']) {    
        send_json_response(false, "No se pudo cargar el módulo solicitado.", ["html" => $moduleResult['html']], 404);
    }

    $mainCssUrl = null;
    if ($moduleResult['main_skin_override'] && !empty($moduleResult['skin'])) {
        $mainCssUrl = PUBLIC_URL . "/assets/css/" . $moduleResult['skin'] . "/main.css";
    }

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
    error_log("Error fatal en getModule.php: " . $e->getMessage());
    send_json_response(
        false,
        "Ocurrió un error inesperado en el servidor.",
        (defined('DEV') && DEV) ? ["details" => $e->getMessage(), "file" => $e->getFile(), "line" => $e->getLine()] : null,
        500
    );
}