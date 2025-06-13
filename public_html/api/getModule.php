<?php
header("Access-Control-Allow-Origin: https://test.loc.ar");
header('Content-Type: application/json');
ini_set('display_errors', 1);
error_reporting(E_ALL);

require_once __DIR__ . '/../../loc-ar/src/View.php';
require_once __DIR__ . '/../../loc-ar/src/EventManager.php';
require_once __DIR__ . '/../../loc-ar/src/Utils.php';

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
foreach ($manifest['modules'] as $module) {
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
$logicPath = __DIR__ . '/../../loc-ar/src/modules/' . $moduleType . '.php';

if (file_exists($logicPath)) {
    require_once $logicPath;

    $eventManager = new EventManager($manifest['timed_events'] ?? []);
    $activeEventContext = $eventManager->getContext();

    $moduleData = get_module_data($moduleConfig, $manifest, $activeEventContext);
    echo View::render('modules/' . $moduleType, $moduleData);

} else {
    http_response_code(500);
    echo "<div class='app-error'>Error: No se encontró la lógica para el módulo de tipo '{$moduleType}'.</div>";
}