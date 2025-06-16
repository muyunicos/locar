<?php
ini_set('display_errors', 1);
error_reporting(E_ALL);

require_once __DIR__ . '/../../test/src/View.php';
require_once __DIR__ . '/../../test/src/EventManager.php';
require_once __DIR__ . '/../../test/src/Utils.php';

define('CLIENT_ID', $_GET['client'] ?? '');
define('BASE_URL', 'https://loc.ar/');

$moduleId = $_GET['id'] ?? '';

if (!preg_match('/^[a-zA-Z0-9_-]+$/', CLIENT_ID) || !preg_match('/^[a-zA-Z0-9_-]+$/', $moduleId)) {
    http_response_code(400);
    die("<div class='app-error'>Error: ID de cliente o módulo inválido.</div>");
}

$manifestPath = __DIR__ . '/../' . CLIENT_ID . '/datos/manifest.json';
if (!file_exists($manifestPath)) {
    http_response_code(404);
    die("<div class='app-error'>Error: Manifiesto no encontrado.</div>");
}

$manifest = json_decode(file_get_contents($manifestPath), true);

$moduleConfig = null;
foreach ($manifest['modulos'] as $module) {
    if ((string)$module['id'] === $moduleId) {
        $moduleConfig = $module;
        break;
    }
}

if (!$moduleConfig) {
    http_response_code(404);
    die("<div class='app-error'>Error: Módulo con ID '{$moduleId}' no encontrado.</div>");
}

$moduleType = $moduleConfig['type'];

$logicPath = __DIR__ . '/../../test/src/modules/' . $moduleType . '.php';

if (file_exists($logicPath)) {
    require_once $logicPath;

    $eventManager = new EventManager($manifest['timed_events'] ?? []);
    $activeEventContext = $eventManager->getContext();
    $activeEvent = $activeEventContext['active_event'];
    $globalSkin = $activeEvent['then']['set_skin'] ?? $manifest['default_skin'];

    $moduleData = get_module_data($moduleConfig, $manifest, $activeEventContext);

    $moduleSkin = $moduleData['skin'] ?? $globalSkin;
    
    $cssUrl = null;
    $moduleCssPath = "/asset/css/{$moduleSkin}/{$moduleType}.css";
    if (file_exists(__DIR__ . '/../../public_html' . $moduleCssPath)) {
        $cssUrl = BASE_URL . ltrim($moduleCssPath, '/');
    }

    $htmlContent = View::render('modules/' . $moduleType, $moduleData);

    header("Access-Control-Allow-Origin: https://revel.loc.ar");
    header('Content-Type: application/json');
    echo json_encode([
        'html' => $htmlContent,
        'css_url' => $cssUrl
    ]);

} else {
    http_response_code(500);
    echo "<div class='app-error'>Error: No se encontró la lógica para el módulo de tipo '{$moduleType}'.</div>";
}