<?php


if (isset($_GET['url'])) {
    header('Access-Control-Allow-Origin: ' . $_GET['url']);
}

header('Access-Control-Allow-Credentials: true');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    http_response_code(200); // OK
    exit();
}
require_once(dirname(__DIR__, 4) . '/core/test/src/bootstrap.php');

header('Content-Type: application/json');

if (!defined('CLIENT_ID')) {
    define('CLIENT_ID', $_GET['client'] ?? 'test');
}
if (!defined('DEV_BRANCH')) {
    define('DEV_BRANCH', $_GET['dev'] ?? 'test');
}

require_once(dirname(__DIR__, 4) . '/core/' . DEV_BRANCH . '/src/Config.php');
require_once(PRIVATE_PATH . '/src/admin/AuthManager.php');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Método no permitido.']);
    exit();
}

$input = json_decode(file_get_contents('php://input'), true);
$username = $input['username'] ?? '';
$password = $input['password'] ?? '';

$authManager = new AuthManager();
if ($authManager->login($username, $password)) {
    echo json_encode(['success' => true]);
} else {
    echo json_encode(['success' => false, 'message' => 'Usuario o contraseña incorrectos.']);
}

exit();