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

// FIX: Corrected path to manifest.json
$manifestPath = __DIR__ . '/../datos/manifest.json';
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

    $eventManager = new EventManager($manifest['eventos'] ?? []);
    $activeEventContext = $eventManager->getContext();
    $activeEvent = $activeEventContext['active_event'];
    $globalSkin = $activeEvent['then']['set_skin'] ?? $manifest['default_skin'];

    $moduleData = get_module_data($moduleConfig, $manifest, $activeEventContext);

    $moduleSkin = $moduleData['skin'] ?? $globalSkin;
    
    $cssUrl = null;
    $moduleCssPath = "/test/asset/css/{$moduleSkin}/{$moduleType}.css";
    if (file_exists(__DIR__ . '/../../public_html' . $moduleCssPath)) {
        $cssUrl = BASE_URL . ltrim($moduleCssPath, '/');
    }

    $htmlContent = View::render('modules/' . $moduleType, $moduleData);

$allowed_domains = [
    'loc.ar'
];
$origin = $_SERVER['HTTP_ORIGIN'] ?? null;
$origin_host = null;
$is_allowed = false;

if ($origin) {
    $origin_host = parse_url($origin, PHP_URL_HOST);
    foreach ($allowed_domains as $domain) {
        if ($origin_host === $domain || str_ends_with($origin_host, '.' . $domain)) {
            $is_allowed = true;
            break;
        }
    }
}

if ($is_allowed) {
    header("Access-Control-Allow-Origin: " . $origin);
}



    header('Content-Type: application/json');
    echo json_encode([
        'html' => $htmlContent,
        'css_url' => $cssUrl
    ]);

} else {
    http_response_code(500);
    echo "<div class='app-error'>Error: No se encontró la lógica para el módulo de tipo '{$moduleType}'.</div>";
}