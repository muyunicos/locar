<?php
require_once 'api_bootstrap.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    send_json_response(false, 'Método no permitido.', 405);
}

$authManager = new AuthManager();

if ($authManager->hasAdmins(CLIENT_ID)) {
    send_json_response(false, 'La creación de administrador ya no está permitida.', 403);
}

$email = $_POST['email'] ?? '';
$password = $_POST['password'] ?? '';
$password_confirm = $_POST['password_confirm'] ?? '';

if (empty($email) || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    send_json_response(false, 'Por favor, introduce una dirección de email válida.');
}
if (empty($password) || strlen($password) < 8) {
    send_json_response(false, 'La contraseña debe tener al menos 8 caracteres.');
}
if ($password !== $password_confirm) {
    send_json_response(false, 'Las contraseñas no coinciden.');
}

try {
    $db = DatabaseManager::getInstance()->getConnection();
    $password_hash = password_hash($password, PASSWORD_DEFAULT);

    $stmt = $db->prepare(
        "INSERT INTO users (client_id, email, password_hash, role, created_at) 
         VALUES (:client_id, :email, :password_hash, 'admin', NOW())"
    );

    $stmt->execute([
        ':client_id' => CLIENT_ID,
        ':email' => $email,
        ':password_hash' => $password_hash
    ]);

    send_json_response(true, 'Administrador creado correctamente. Ahora puedes iniciar sesión.');

} catch (PDOException $e) {
    error_log('Error al crear el primer admin: ' . $e->getMessage());
    send_json_response(false, 'Ocurrió un error en el servidor. Inténtalo de nuevo más tarde.', 500);
}