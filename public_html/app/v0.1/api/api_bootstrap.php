<?php

ini_set("display_errors", 1);
error_reporting(E_ALL);

$request_data = $_REQUEST;

if (
    in_array($_SERVER['REQUEST_METHOD'], ['POST', 'PUT', 'PATCH']) &&
    isset($_SERVER['CONTENT_TYPE']) &&
    strpos($_SERVER['CONTENT_TYPE'], 'application/json') !== false
) {
    $json_input = json_decode(file_get_contents('php://input'), true);
    if (is_array($json_input)) {
        $request_data = array_merge($_REQUEST, $json_input);
    }
}

define("CLIENT_URL", $_REQUEST['url'] ?? null);
define("CLIENT_ID", $_REQUEST['client'] ?? null);
define("DEV_BRANCH", $_REQUEST["dev"] ?? null);

if (!CLIENT_ID) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'El parámetro "client" es requerido.']);
    exit;
}

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

require_once PRIVATE_PATH . "/src/bootstrap.php";
require_once PRIVATE_PATH . "/src/admin/AuthManager.php";

require_once PRIVATE_PATH . "/src/DatabaseManager.php";

function send_json_response($success, $message, $data = null, $statusCode = 200) {
    http_response_code($statusCode);
    $response = ['success' => $success, 'message' => $message];
    if ($data !== null) {
        $response['data'] = $data;
    }
    echo json_encode($response);
    exit;
}
global $input;
$input = $request_data;