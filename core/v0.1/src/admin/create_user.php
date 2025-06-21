<?php

define('ROOT_PATH', dirname(dirname(dirname(dirname(__FILE__)))));
define('CORE_PATH', ROOT_PATH . '/core/v0.1');
require_once CORE_PATH . '/src/DatabaseManager.php';

if ($argc !== 4) {
    echo "Uso: php create_user.php <client_id> <email> <password>\n";
    exit(1);
}

$clientId = $argv[1];
$email = $argv[2];
$password = $argv[3];

$passwordHash = password_hash($password, PASSWORD_DEFAULT);

try {
    $db = DatabaseManager::getInstance()->getConnection();
    $stmt = $db->prepare(
        "INSERT INTO users (client_id, email, password_hash) VALUES (:client_id, :email, :password_hash)"
    );
    $stmt->execute([
        ':client_id' => $clientId,
        ':email' => $email,
        ':password_hash' => $passwordHash
    ]);
    echo "Usuario creado exitosamente para el cliente '$clientId'.\n";
} catch (PDOException $e) {
    echo "Error al crear el usuario: " . $e->getMessage() . "\n";
}