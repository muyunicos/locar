<?php
session_start();
header('Content-Type: application/json');

define('CLIENT_ID', $_GET['client'] ?? 'test');
define('DEV_BRANCH', $_GET['dev'] ?? 'test');

require_once(dirname(__DIR__, 4) . '/core/' . DEV_BRANCH . '/src/Config.php');
require_once(PRIVATE_PATH . '/src/admin/AuthManager.php');

$authManager = new AuthManager();

$input = json_decode(file_get_contents('php://input'), true);
$username = $input['username'] ?? '';
$password = $input['password'] ?? '';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Método no permitido.']);
    exit();
}

if ($authManager->login($username, $password)) {
    echo json_encode(['success' => true]);
} else {
    echo json_encode(['success' => false, 'message' => 'Usuario o contraseña incorrectos.']);
}