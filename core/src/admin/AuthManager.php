<?php
namespace Admin;
use Core\DatabaseManager;
use PDO;
use PDOException;
use Exception;

class AuthManager {
    private $db;
    private const MAX_LOGIN_ATTEMPTS = 5;
    private const LOCKOUT_TIME_MINUTES = 15;

    public function __construct()
    {
        if (session_status() == PHP_SESSION_NONE) {
            session_start();
        }
        $this->db = DatabaseManager::getInstance()->getConnection();
    }

    public function login($email, $password)
    {
        if ($this->isBruteForceBlocked($email)) {
            error_log("Bloqueo por fuerza bruta para email: $email, IP: " . $this->getUserIP());
            return false;
        }
        
        try {
            $stmt = $this->db->prepare("SELECT id, password_hash FROM users WHERE email = :email AND client_id = :client_id AND role = 'admin'");
            $stmt->execute(['email' => $email, 'client_id' => CLIENT_ID]);
            $user = $stmt->fetch(PDO::FETCH_ASSOC);

            if ($user && password_verify($password, $user['password_hash'])) {
                $this->clearLoginAttempts($email);

                $_SESSION['admin_sessions'][CLIENT_ID] = [
                    'user_id' => $user['id'],
                    'login_time' => time(),
                    'is_logged_in' => true
                ];

                session_regenerate_id(true);

                return true;
            } else {
                $this->recordFailedLoginAttempt($email);
                return false;
            }
        } catch (PDOException $e) {
            error_log("Error en el inicio de sesión: " . $e->getMessage());
            return false;
        } catch (Exception $e) {
            error_log("Error inesperado en login: " . $e->getMessage());
            return false;
        }
    }

    public function logout()
    {
        if (isset($_SESSION['admin_sessions'][CLIENT_ID])) {
            unset($_SESSION['admin_sessions'][CLIENT_ID]);
        }
    }

    public function isLoggedIn()
    {
        if (isset($_SESSION['admin_sessions'][CLIENT_ID]) && $_SESSION['admin_sessions'][CLIENT_ID]['is_logged_in']) {
            $twoWeeksInSeconds = 14 * 24 * 60 * 60;
            $loginTime = $_SESSION['admin_sessions'][CLIENT_ID]['login_time'];
            if (time() - $loginTime > $twoWeeksInSeconds) {
                $this->logout();
                return false;
            }
            return true;
        }
        return false;
    }

    public function getUserId()
    {
        if ($this->isLoggedIn()) {
            return $_SESSION['admin_sessions'][CLIENT_ID]['user_id'];
        }
        return null;
    }

    public function hasAdmins()
    {
        try {
            $stmt = $this->db->prepare("SELECT COUNT(*) FROM users WHERE client_id = :client_id AND role = 'admin'");
            $stmt->execute(['client_id' => CLIENT_ID]);
            $count = $stmt->fetchColumn();
            return $count > 0;
        } catch (PDOException $e) {
            error_log("Error en hasAdmins: " . $e->getMessage());
            return false; 
        } catch (Exception $e) {
            error_log("Error inesperado en hasAdmins: " . $e->getMessage());
            return false;
        }
    }

    public function validateResetToken($token)
    {
        try {
            $stmt = $this->db->prepare("SELECT * FROM users WHERE password_reset_token = :token AND password_reset_expires > NOW()");
            $stmt->execute(['token' => $token]);
            return $stmt->fetch(PDO::FETCH_ASSOC);
        } catch (PDOException $e) {
            error_log("Error en validateResetToken: " . $e->getMessage());
            return false;
        } catch (Exception $e) {
            error_log("Error inesperado en validateResetToken: " . $e->getMessage());
            return false;
        }
    }
    
    private function getUserIP()
    {
        return $_SERVER['REMOTE_ADDR'];
    }

    private function isBruteForceBlocked($email)
    {
        try {
            $stmt = $this->db->prepare(
                "SELECT COUNT(*) FROM login_attempts 
                 WHERE (email_attempted = :email OR ip_address = :ip_address) 
                 AND attempt_time > NOW() - INTERVAL :lockout_time MINUTE"
            );
            $stmt->execute([
                'email' => $email,
                'ip_address' => $this->getUserIP(),
                'lockout_time' => self::LOCKOUT_TIME_MINUTES
            ]);
            $attempts = $stmt->fetchColumn();
            
            return $attempts >= self::MAX_LOGIN_ATTEMPTS;
        } catch (PDOException $e) {
            error_log("Error en isBruteForceBlocked: " . $e->getMessage());
            return false;
        } catch (Exception $e) {
            error_log("Error inesperado en isBruteForceBlocked: " . $e->getMessage());
            return false;
        }
    }

    private function recordFailedLoginAttempt($email)
    {
        try {
            $stmt = $this->db->prepare(
                "INSERT INTO login_attempts (ip_address, email_attempted, attempt_time) 
                 VALUES (:ip_address, :email, NOW())"
            );
            $stmt->execute([
                'ip_address' => $this->getUserIP(),
                'email' => $email
            ]);
        } catch (PDOException $e) {
            error_log("Error en recordFailedLoginAttempt: " . $e->getMessage());
        } catch (Exception $e) {
            error_log("Error inesperado en recordFailedLoginAttempt: " . $e->getMessage());
        }
    }

    private function clearLoginAttempts($email)
    {
        try {

            $stmt = $this->db->prepare(
                "DELETE FROM login_attempts 
                 WHERE email_attempted = :email OR ip_address = :ip_address"
            );
            $stmt->execute([
                'email' => $email,
                'ip_address' => $this->getUserIP()
            ]);
        } catch (PDOException $e) {
            error_log("Error en clearLoginAttempts: " . $e->getMessage());
        } catch (Exception $e) {
            error_log("Error inesperado en clearLoginAttempts: " . $e->getMessage());
        }
    }
}