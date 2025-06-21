<?php

class AuthManager
{
    private const ADMIN_USERNAME = 'admin';
    private const CREDENTIALS_PATH = __DIR__ . '/credentials/';

    public function __construct()
    {
        if (session_status() == PHP_SESSION_NONE) {
            session_start();
        }
    }

    public function login(string $username, string $password): bool
    {
        if ($username !== self::ADMIN_USERNAME) {
            return false;
        }

        if (!defined('CLIENT_ID')) {
            return false;
        }
        $credentialFile = self::CREDENTIALS_PATH . CLIENT_ID . '.pass';

        if (!file_exists($credentialFile)) {
            return false;
        }

        $storedHash = trim(file_get_contents($credentialFile));

        if (password_verify($password, $storedHash)) {
            if (!isset($_SESSION['admin_sessions'])) {
                $_SESSION['admin_sessions'] = [];
            }
            $_SESSION['admin_sessions'][CLIENT_ID] = [
                'is_logged_in' => true,
                'user' => $username,
                'login_time' => time()
            ];
            return true;
        }

        return false;
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
        return isset($_SESSION['admin_sessions'][CLIENT_ID]['is_logged_in']) 
               && $_SESSION['admin_sessions'][CLIENT_ID]['is_logged_in'] === true;
    }
}