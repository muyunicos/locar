<?php

ini_set("display_errors", 1);
error_reporting(E_ALL);

$allowed_domains = ['loc.ar']; 
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
$is_origin_allowed = false;

if ($origin) {
    $origin_host = parse_url($origin, PHP_URL_HOST);
    foreach ($allowed_domains as $domain) {
        if ($origin_host === $domain || str_ends_with($origin_host, '.' . $domain)) {
            $is_origin_allowed = true;
            break;
        }
    }
}

if (!$is_origin_allowed) {
    http_response_code(403);
    die("Error: Origen no permitido.");
}

define("CLIENT_URL", $origin);

if (isset($_REQUEST['client'])) {
    define("CLIENT_ID", $_REQUEST['client']);
} else {
    $host_parts = explode('.', parse_url(CLIENT_URL, PHP_URL_HOST));
    define("CLIENT_ID", $host_parts[0]);
}

define("DEV_BRANCH", $_REQUEST["dev"] ?? null);


header('Access-Control-Allow-Origin: ' . CLIENT_URL);
header("Access-Control-Allow-Credentials: true");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    http_response_code(200);
    exit;
}

header("Content-Type: application/json");

require_once defined("DEV_BRANCH") && DEV_BRANCH ? dirname(__DIR__, 4) . "/core/" . DEV_BRANCH . "/src/Config.php" : dirname(__DIR__, 3) . "/core/src/config.php";

require_once PRIVATE_PATH . "/src/DatabaseManager.php";
require_once PRIVATE_PATH . "/src/bootstrap.php";
require_once PRIVATE_PATH . "/src/admin/AuthManager.php";

function send_json_response($success, $message, $statusCode = 200) {
    http_response_code($statusCode);
    echo json_encode(['success' => $success, 'message' => $message]);
    exit;
}