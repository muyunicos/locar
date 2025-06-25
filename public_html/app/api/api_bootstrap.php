<?php

if (isset($_SERVER['HTTP_ORIGIN'])) {
    $origin = $_SERVER['HTTP_ORIGIN'];
    if (preg_match('/^https:\/\/(?:[a-zA-Z0-9-]+\.)*loc\.ar$/', $origin)) {
        header("Access-Control-Allow-Origin: " . $origin);
        header("Access-Control-Allow-Credentials: true");
        header("Access-Control-Allow-Headers: Content-Type, Accept");
        header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
    }

    if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
        exit(0);
    }
}

$request_data = $_REQUEST;

if (
    in_array($_SERVER['REQUEST_METHOD'], ['POST', 'PUT', 'PATCH']) &&
    isset($_SERVER['CONTENT_TYPE']) &&
    strpos($_SERVER['CONTENT_TYPE'], 'application/json') !== false
) {
    $json_input = json_decode(file_get_contents('php://input'), true);
    if (is_array($json_input)) {
        $request_data = array_merge($request_data, $json_input);
    }
}

define("CLIENT_URL", $request_data['url'] ?? null);
define("CLIENT_ID", $request_data['client_id'] ?? null);
define("VERSION", $request_data['version'] ?? '');

if (!defined('IS_ADMIN_URL')) {
    $final_is_admin_value = false;
    if (isset($request_data['is_admin_url']) && $request_data['is_admin_url'] !== null) {
        $final_is_admin_value = $request_data['is_admin_url'];
    } else {
        $current_url = $_SERVER['REQUEST_URI'] ?? '/';
        $admin_url_patterns = ['/admin', '/dashboard', '/secure']; 

        foreach ($admin_url_patterns as $pattern) {
            if (strpos($current_url, $pattern) !== false) {
                $final_is_admin_value = true;
                break;
            }
        }
    }
    define('IS_ADMIN_URL', $final_is_admin_value);
}


if (!CLIENT_ID) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'El parámetro "client_id" es requerido para las API.']);
    exit;
}

$base_core_path = dirname(__DIR__, VERSION ? 4 : 3);
require_once $base_core_path . "/core/" . (VERSION ? VERSION . '/' : '') . "src/bootstrap.php";

header("Content-Type: application/json");

function send_json_response($success, $message, $data = null, $statusCode = 200) {
    http_response_code($statusCode);
    $response = ['success' => $success, 'message' => $message];
    if ($data !== null) {
        $response['data'] = $data;
    }
    if (defined('DEV') && DEV) {
        global $dev_logs;
        if (isset($dev_logs) && is_array($dev_logs)) {
            $response['server_logs'] = $dev_logs;
        }
    }
    echo json_encode($response);
    exit;
}

global $input;
$input = $request_data;

if (defined('DEV') && DEV) {
    log_dev_message("api_bootstrap.php finalizado. Request Data: " . json_encode($input) . " and IS_ADMIN_URL: " . (IS_ADMIN_URL ? 'true' : 'false'));
}