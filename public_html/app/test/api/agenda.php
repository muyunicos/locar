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

require_once PRIVATE_PATH . "/src/EventManager.php";

if (!preg_match('/^[a-zA-Z0-9_-]+$/', CLIENT_ID)) {
    http_response_code(400);
    echo json_encode(["error" => "ID de cliente inválido."]);
    exit();
}

$manifestPath = CLIENT_PATH . "/datos/manifest.json";

if (!file_exists($manifestPath)) {
    http_response_code(404);
    echo json_encode(["error" => "Manifiesto no encontrado para el cliente."]);
    exit();
}

$manifest = json_decode(file_get_contents($manifestPath), true);
if (json_last_error() !== JSON_ERROR_NONE) {
    http_response_code(500);
    echo json_encode(["error" => "Error al leer el manifiesto."]);
    exit();
}

try {
    $eventManager = new EventManager($manifest["eventos"] ?? []);

    $timezone = new DateTimeZone("America/Argentina/Buenos_Aires");
    $now = new DateTime("now", $timezone);
    $until = (clone $now)->add(new DateInterval("PT6H"));

    $agenda = $eventManager->getEventsAgenda($until);

    echo json_encode([
        "server_time_iso" => $now->format(DateTime::ISO8601),
        "events_agenda" => $agenda,
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        "error" => "Ocurrió un error en el servidor.",
        "details" => $e->getMessage(),
    ]);
}
