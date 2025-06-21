<?php

require_once 'api_bootstrap.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    send_json_response(false, 'Método no permitido.', 405);
}

$token = $_POST['token'] ?? '';
$password = $_POST['new_password'] ?? '';
$password_confirm = $_POST['new_password_confirm'] ?? '';

if (empty($token) || empty($password) || empty($password_confirm)) {
    send_json_response(false, 'Todos los campos son obligatorios.');
}
if (strlen($password) < 8) {
    send_json_response(false, 'La contraseña debe tener al menos 8 caracteres.');
}
if ($password !== $password_confirm) {
    send_json_response(false, 'Las contraseñas no coinciden.');
}

try {
    $authManager = new AuthManager();
    $user = $authManager->validateResetToken($token);

    if (!$user) {
        send_json_response(false, 'El enlace es inválido o ha expirado. Por favor, solicita un nuevo enlace.');
    }

    $db = DatabaseManager::getInstance()->getConnection();
    $password_hash = password_hash($password, PASSWORD_DEFAULT);

    $stmt = $db->prepare(
        "UPDATE users SET password_hash = :password_hash, password_reset_token = NULL, password_reset_expires = NULL WHERE id = :id"
    );
    $stmt->execute([':password_hash' => $password_hash, ':id' => $user['id']]);
    
    send_json_response(true, 'Contraseña actualizada correctamente. Ya puedes iniciar sesión.');

} catch (PDOException $e) {
    error_log('Error en perform_password_reset: ' . $e->getMessage());
    send_json_response(false, 'Ocurrió un error en el servidor. Inténtalo de nuevo más tarde.', 500);
}