<?php
require_once CORE_PATH . '/src/DatabaseManager.php';
class AuthManager
{
    private $db;

    public function __construct()
    {
        if (session_status() == PHP_SESSION_NONE) {
            session_start();
        }
    }

    public function login($email, $password) {
        try {
            $stmt = $this->db->prepare("SELECT password_hash FROM users WHERE email = :email AND client_id = :client_id");
            
            $stmt->execute([
                ':email' => $email,
                ':client_id' => CLIENT_ID
            ]);

            $user = $stmt->fetch(PDO::FETCH_ASSOC);

            if ($user && password_verify($password, $user['password_hash'])) {
                $_SESSION['admin_sessions'][CLIENT_ID] = [
                    'logged_in' => true,
                    'email' => $email,
                    'login_time' => time()
                ];
                return true;
            }

            return false;

        } catch (PDOException $e) {
            return false;
        }
    }

    public function logout(): void
    {
        if (defined('CLIENT_ID') && isset($_SESSION['admin_sessions'][CLIENT_ID])) {
            unset($_SESSION['admin_sessions'][CLIENT_ID]);
        }
    }

    public function isLoggedIn(): bool
    {
        if (!defined('CLIENT_ID')) {
            return false;
        }
        return isset($_SESSION['admin_sessions'][CLIENT_ID]['logged_in']) && $_SESSION['admin_sessions'][CLIENT_ID]['logged_in'] === true;
    }
}