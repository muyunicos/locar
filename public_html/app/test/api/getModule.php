<?php
ini_set("display_errors", 1);
error_reporting(E_ALL);

if (isset($_GET["client"]) && !defined("CLIENT_ID")) {
    define("CLIENT_ID", $_GET["client"]);
}

if (isset($_GET["dev"]) && !defined("DEV_BRANCH")) {
    define("DEV_BRANCH", $_GET["dev"]);
}

require_once defined("DEV_BRANCH") && DEV_BRANCH
    ? dirname(__DIR__, 4) . "/core/" . DEV_BRANCH . "/src/Config.php"
    : dirname(__DIR__, 3) . "/core/src/Config.php";

header("Access-Control-Allow-Origin: " . CLIENT_URL);
header("Access-Control-Allow-Credentials: true");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header(
    "Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With"
);
header("Content-Type: application/json");

require_once PRIVATE_PATH . "/src/View.php";
require_once PRIVATE_PATH . "/src/EventManager.php";
require_once PRIVATE_PATH . "/src/Utils.php";

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
$moduleConfig = null;
foreach ($manifest["modulos"] as $module) {
    if ((string) $module["id"] === $moduleId) {
        $moduleConfig = $module;
        break;
    }
}

if (!$moduleConfig) {
    http_response_code(404);
    echo json_encode([
        "error" => "Error: Módulo con ID '{$moduleId}' no encontrado.",
    ]);
    exit();
}

$moduleType = $moduleConfig["tipo"];
$logicPath = PRIVATE_PATH . "/src/modules/" . $moduleType . ".php";

if (file_exists($logicPath)) {
    require_once $logicPath;

    $eventManager = new EventManager($manifest["eventos"] ?? []);
    $activeEventContext = $eventManager->getContext();

    $moduleData = get_module_data($moduleConfig, $activeEventContext);

    $activeEvent = $activeEventContext["active_event"];
    $globalSkin = $activeEvent["cambios"]["skin"] ?? $manifest["skin"];
    $moduleSkin = $moduleData["skin"] ?? $globalSkin;
    $cssUrl = null;
    $moduleCssPath = "asset/css/{$moduleSkin}/{$moduleType}.css";

    if (file_exists(PUBLIC_PATH . $moduleCssPath)) {
        $cssUrl = PUBLIC_URL . $moduleCssPath;
    }

    $htmlContent = View::render("modules/" . $moduleType, $moduleData);

    echo json_encode([
        "html" => $htmlContent,
        "css_url" => $cssUrl,
    ]);
} else {
    http_response_code(500);
    echo json_encode([
        "error" => "Error: No se encontró la lógica para el módulo de tipo '{$moduleType}'.",
    ]);
    exit();
}
