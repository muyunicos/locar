<?php
require_once __DIR__ . '/api_bootstrap.php';

use Core\DatabaseManager;
use Core\Utils;
use Core\EventManager;

function send_generic_success_response() {
    send_json_response(
        true,
        'Si tu correo electrónico se encuentra en nuestros registros, recibirás un enlace para restablecer tu contraseña.',
        null,
        200 
    );
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    send_json_response(false, 'Método no permitido.', null, 405);
}

$email = $input['email'] ?? '';
log_dev_message("request_password_reset: Solicitud de restablecimiento para email: " . $email);

if (empty($email) || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    log_dev_message("request_password_reset: Email inválido o vacío. Enviando respuesta genérica.");
    send_generic_success_response();
}

try {
    $db = DatabaseManager::getInstance()->getConnection();

    $stmt = $db->prepare("SELECT id FROM users WHERE email = :email AND client_id = :client_id AND role = 'admin'");
    $stmt->execute([':email' => $email, ':client_id' => CLIENT_ID]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    if ($user) {
        log_dev_message("request_password_reset: Usuario encontrado con ID: " . $user['id']);
        $token = bin2hex(random_bytes(32));
        $expires = new DateTime('+1 hour');
        $expires_str = $expires->format('Y-m-d H:i:s');

        $updateStmt = $db->prepare(
            "UPDATE users SET password_reset_token = :token, password_reset_expires = :expires WHERE id = :id"
        );
        $updateStmt->execute([':token' => $token, ':expires' => $expires_str, ':id' => $user['id']]);

        $resetLink = CLIENT_URL . '/admin?reset=' . $token;
        $subject = 'Restablecimiento de contraseña';
        $message = "Hola,\n\nHemos recibido una solicitud para restablecer tu contraseña. Haz clic en el siguiente enlace para continuar:\n\n" . $resetLink . "\n\nEste enlace expirará en 1 hora.\n\nSi no solicitaste esto, puedes ignorar este correo de forma segura.";
        
        $headers = 'From: no-reply@' . ($_SERVER['HTTP_HOST'] ?? 'loc.ar');

        log_dev_message("request_password_reset: Intentando enviar correo a: " . $email . " con enlace: " . $resetLink);
        
        if (mail($email, $subject, $message, $headers)) {
            log_dev_message("request_password_reset: Correo de restablecimiento enviado exitosamente.");
        } else {
            error_log("Error: Falló el envío de correo de restablecimiento a " . $email);
            log_dev_message("request_password_reset: FALLÓ el envío de correo de restablecimiento.");
        }
    } else {
        log_dev_message("request_password_reset: Usuario NO encontrado para email: " . $email);
    }
    
    send_generic_success_response();

} catch (PDOException $e) {
    error_log('Error en request_password_reset: ' . $e->getMessage());
    log_dev_message('request_password_reset: Excepción PDO: ' . $e->getMessage());
    send_generic_success_response();
} catch (Exception $e) {
    error_log('Error inesperado en request_password_reset: ' . $e->getMessage());
    log_dev_message('request_password_reset: Excepción inesperada: ' . $e->getMessage());
    send_generic_success_response();
}