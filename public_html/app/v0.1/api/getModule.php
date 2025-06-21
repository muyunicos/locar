<?php
ini_set("display_errors", 1);
error_reporting(E_ALL);

if (isset($_GET["client"]) && !defined("CLIENT_ID")) {
    define("CLIENT_ID", $_GET["client"]);
}

if (isset($_GET["url"]) && !defined("CLIENT_URL")) {
    define("CLIENT_URL", $_GET["url"]);
}

if (isset($_GET["dev"]) && !defined("DEV_BRANCH")) {
    define("DEV_BRANCH", $_GET["dev"]);
}

require_once defined("DEV_BRANCH") && DEV_BRANCH ? dirname(__DIR__, 4) . "/core/" . DEV_BRANCH . "/src/Config.php" : dirname(__DIR__, 3) . "/core/src/config.php";

header('Access-Control-Allow-Origin: ' . CLIENT_URL );
header("Access-Control-Allow-Credentials: true");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");

header("Content-Type: application/json");

require_once PRIVATE_PATH . "/src/View.php";
require_once PRIVATE_PATH . "/src/EventManager.php";
require_once PRIVATE_PATH . "/src/Utils.php";
require_once PRIVATE_PATH . "/src/ModuleLoader.php";
require_once PRIVATE_PATH . "/src/admin/AuthManager.php";

$authManager = new AuthManager();
$isAdmin = $authManager->isLoggedIn();

$moduleId = $_GET["id"] ?? "";

if (
    !preg_match('/^[a-zA-Z0-9_-]+$/', CLIENT_ID) ||
    !preg_match('/^[a-zA-Z0-9_-]+$/', $moduleId)
) {
    http_response_code(400);
    echo json_encode(["error" => "Error: ID de cliente o módulo inválido."]);
    exit();
}

$manifestPath = CLIENT_PATH . "/datos/manifest.json";

if (!file_exists($manifestPath)) {
    http_response_code(404);
    echo json_encode([
        "error" => "Error: Manifiesto no encontrado. Path: " . $manifestPath,
    ]);
    exit();
}

$manifest = json_decode(file_get_contents($manifestPath), true);

$eventManager = new EventManager($manifest["eventos"] ?? []);
$activeEventContext = $eventManager->getContext();

$moduleLoader = new ModuleLoader($manifest, $activeEventContext);
$moduleResult = $moduleLoader->loadById($moduleId, $isAdmin);

if ($moduleResult['error']) {
    http_response_code(404);
    echo json_encode(["html" => $moduleResult['html'], "css_url" => null]);
    exit();
}

$responseData = [
    "html" => $moduleResult['html'],
    "css_url" => $moduleResult['css_url'],
    "main_skin_override" => $moduleResult['main_skin_override'],
    "sufijo" => $moduleResult['sufijo'],
    "module_type" => $moduleResult['module_type'] ?? null,
    "admin_js_url" => $moduleResult['admin_js_url'] ?? null,
];

if ($moduleResult['main_skin_override']) {
    $mainCssUrl = PUBLIC_URL . "/assets/css/" . $moduleResult['skin'] . "/main.css";
    $responseData['main_css_url'] = $mainCssUrl;
}


echo json_encode($responseData);