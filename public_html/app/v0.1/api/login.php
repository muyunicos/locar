<?php

require_once __DIR__ . '/api_bootstrap.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    send_json_response(false, 'Método no permitido.', 405);
}

$email = $_POST['email'] ?? '';
$password = $_POST['password'] ?? '';

if (empty($email) || empty($password)) {
    send_json_response(false, 'El email y la contraseña son obligatorios.');
}

try {
    $authManager = new AuthManager();
    
    if ($authManager->login($email, $password)) {
        send_json_response(true, 'Inicio de sesión exitoso.');
    } else {
        send_json_response(false, 'Las credenciales son incorrectas.', 401);
    }
} catch (Exception $e) {
    error_log('Error en login.php: ' . $e->getMessage());
    send_json_response(false, 'Ocurrió un error inesperado en el servidor.', 500);
}