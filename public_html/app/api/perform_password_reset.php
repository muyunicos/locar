<?php
require_once __DIR__ . '/api_bootstrap.php';

use Admin\AuthManager;
use Core\DatabaseManager;

if ($_SERVER['REQUEST_METHOD'] !== 'POST') { 
    send_json_response(false, 'Método no permitido.', null, 405);
}

$token = $input['token'] ?? ''; 
$password = $input['new_password'] ?? ''; 
$password_confirm = $input['new_password_confirm'] ?? '';

log_dev_message("perform_password_reset: Solicitud de cambio de contraseña para token: " . substr($token, 0, 10) . "...");

if (empty($token) || empty($password) || empty($password_confirm)) {
    log_dev_message("perform_password_reset: Campos obligatorios vacíos.");
    send_json_response(false, 'Todos los campos son obligatorios.');
}

if (strlen($password) < 8) {
    log_dev_message("perform_password_reset: Contraseña demasiado corta.");
    send_json_response(false, 'La contraseña debe tener al menos 8 caracteres.');
}

if ($password !== $password_confirm) {
    log_dev_message("perform_password_reset: Las contraseñas no coinciden.");
    send_json_response(false, 'Las contraseñas no coinciden.');
}

try {
    $authManager = new AuthManager();
    $user = $authManager->validateResetToken($token);

    if (!$user) {
        log_dev_message("perform_password_reset: Token inválido o expirado.");
        send_json_response(false, 'El enlace es inválido o ha expirado. Por favor, solicita un nuevo enlace.');
    }

    log_dev_message("perform_password_reset: Token válido para usuario ID: " . $user['id']);

    $db = DatabaseManager::getInstance()->getConnection();
    $password_hash = password_hash($password, PASSWORD_DEFAULT);

    $stmt = $db->prepare(
        "UPDATE users SET password_hash = :password_hash, password_reset_token = NULL, password_reset_expires = NULL WHERE id = :id"
    );
    $stmt->execute([':password_hash' => $password_hash, ':id' => $user['id']]);
    
    log_dev_message("perform_password_reset: Contraseña actualizada para usuario ID: " . $user['id']);
    send_json_response(true, 'Contraseña actualizada correctamente. Ya puedes iniciar sesión.');

} catch (PDOException $e) {
    error_log('Error en perform_password_reset (PDO): ' . $e->getMessage());
    log_dev_message('perform_password_reset: Excepción PDO: ' . $e->getMessage());
    send_json_response(
        false,
        'Ocurrió un error en el servidor. Inténtalo de nuevo más tarde.',
        DEV ? ["details" => $e->getMessage(), "file" => $e->getFile(), "line" => $e->getLine()] : null,
        500
    );
} catch (Exception $e) {
    error_log('Error inesperado en perform_password_reset: ' . $e->getMessage());
    log_dev_message('perform_password_reset: Excepción inesperada: ' . $e->getMessage());
    send_json_response(
        false,
        'Ocurrió un error en el servidor. Inténtalo de nuevo más tarde.',
        DEV ? ["details" => $e->getMessage(), "file" => $e->getFile(), "line" => $e->getLine()] : null,
        500
    );
}