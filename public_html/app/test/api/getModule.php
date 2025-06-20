<?php
ini_set('display_errors', 1);
error_reporting(E_ALL);

// --- START: CORS HANDLING ---
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
    header("Access-Control-Allow-Credentials: true");
    header("Access-Control-Max-Age: 86400"); 
}

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    if ($is_allowed) {
        header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
        header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
    }
    exit(0);
}
// --- END: CORS HANDLING ---

require_once __DIR__ . '/../../test/src/View.php';
require_once __DIR__ . '/../../test/src/EventManager.php';
require_once __DIR__ . '/../../test/src/Utils.php';

// --- START: DEFINICIÓN DE CONSTANTES ---
define('CLIENT_ID', $_GET['client'] ?? '');
// Se define PUBLIC_PATH para que apunte a la raíz web.
define('PUBLIC_PATH', dirname(__DIR__, 2) . '/');
// Se define PRIVATE_PATH para que apunte al directorio /test donde están los templates y la lógica.
define('PRIVATE_PATH', dirname(__DIR__, 2) . '/test/');
define('BASE_URL', 'https://loc.ar/');
define('PRUEBAS', 'test/');
// --- END: DEFINICIÓN DE CONSTANTES ---

$moduleId = $_GET['id'] ?? '';

if (!preg_match('/^[a-zA-Z0-9_-]+$/', CLIENT_ID) || !preg_match('/^[a-zA-Z0-9_-]+$/', $moduleId)) {
    http_response_code(400);
    header('Content-Type: application/json');
    echo json_encode(['error' => 'Error: ID de cliente o módulo inválido.']);
    exit;
}

$manifestPath = PUBLIC_PATH . CLIENT_ID . '/datos/manifest.json';
if (!file_exists($manifestPath)) {
    http_response_code(404);
    header('Content-Type: application/json');
    echo json_encode(['error' => 'Error: Manifiesto no encontrado. Path: ' . $manifestPath]);
    exit;
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
    header('Content-Type: application/json');
    echo json_encode(['error' => "Error: Módulo con ID '{$moduleId}' no encontrado."]);
    exit;
}

$moduleType = $moduleConfig['tipo'];
$logicPath = PRIVATE_PATH . 'src/modules/' . $moduleType . '.php'; // Usa PRIVATE_PATH para consistencia

if (file_exists($logicPath)) {
    require_once $logicPath;

    $eventManager = new EventManager($manifest['eventos'] ?? []);
    $activeEventContext = $eventManager->getContext();
    
    $moduleData = get_module_data($moduleConfig, $activeEventContext);

    $activeEvent = $activeEventContext['active_event'];
    $globalSkin = $activeEvent['cambios']['skin'] ?? $manifest['skin'];
    $moduleSkin = $moduleData['skin'] ?? $globalSkin;
    $cssUrl = null;
    $moduleCssPath = PRUEBAS . "asset/css/{$moduleSkin}/{$moduleType}.css";

    if (file_exists(PUBLIC_PATH . $moduleCssPath)) {
        $cssUrl = BASE_URL . $moduleCssPath;
    }

    $htmlContent = View::render('modules/' . $moduleType, $moduleData);

    header('Content-Type: application/json');
    echo json_encode([
        'html' => $htmlContent,
        'css_url' => $cssUrl
    ]);

} else {
    http_response_code(500);
    header('Content-Type: application/json');
    echo json_encode(['error' => "Error: No se encontró la lógica para el módulo de tipo '{$moduleType}'."]);
    exit;
}