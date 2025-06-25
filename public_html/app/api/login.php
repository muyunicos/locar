<?php
require_once __DIR__ . '/api_bootstrap.php';

use Admin\AuthManager;

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    send_json_response(false, 'Método no permitido.', null, 405);
}

$email = $input['email'] ?? '';
$password = $input['password'] ?? '';

log_dev_message("login.php: Intento de inicio de sesión para email: " . $email);

if (empty($email) || empty($password)) {
    log_dev_message("login.php: Email o contraseña vacíos.");
    send_json_response(false, 'El email y la contraseña son obligatorios.');
}

try {
    $authManager = new AuthManager();
    
    if ($authManager->login($email, $password)) {
        log_dev_message("login.php: Inicio de sesión exitoso para email: " . $email);
        send_json_response(true, 'Inicio de sesión exitoso.');
    } else {
        log_dev_message("login.php: Credenciales incorrectas para email: " . $email);
        send_json_response(false, 'Las credenciales son incorrectas.', null, 401);
    }
} catch (Exception $e) {
    error_log('Error en login.php: ' . $e->getMessage());
    log_dev_message('login.php: Excepción inesperada: ' . $e->getMessage());
    send_json_response(
        false,
        'Ocurrió un error inesperado en el servidor.',
        DEV ? ["details" => $e->getMessage(), "file" => $e->getFile(), "line" => $e->getLine()] : null,
        500
    );
}