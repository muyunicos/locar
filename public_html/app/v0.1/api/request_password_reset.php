<?php

require_once dirname(__DIR__, 4) . '/bootstrap.php';

header('Content-Type: application/json');

function send_generic_response() {
    echo json_encode([
        'success' => true, 
        'message' => 'Si tu correo electrónico se encuentra en nuestros registros, recibirás un enlace para restablecer tu contraseña.'
    ]);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Método no permitido.']);
    exit;
}

$email = $_POST['email'] ?? '';
if (empty($email) || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    send_generic_response();
}

try {
    $db = DatabaseManager::getInstance()->getConnection();
    $stmt = $db->prepare("SELECT id FROM users WHERE email = :email AND client_id = :client_id AND role = 'admin'");
    $stmt->execute([':email' => $email, ':client_id' => CLIENT_ID]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    if ($user) {
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
        $headers = 'From: no-reply@' . $_SERVER['HTTP_HOST'];

        mail($email, $subject, $message, $headers);
    }
    
    send_generic_response();

} catch (PDOException $e) {
    error_log('Error en request_password_reset: ' . $e->getMessage());
    send_generic_response();
}