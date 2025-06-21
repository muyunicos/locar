<?php

class AuthManager
{
    private const ADMIN_USERNAME = 'admin';
    private const ADMIN_PASSWORD = 'password123'; 

    public function __construct()
    {
        if (session_status() == PHP_SESSION_NONE) {
            session_start();
        }
    }

    public function login(string $username, string $password): bool
    {
        if ($username === self::ADMIN_USERNAME && $password === self::ADMIN_PASSWORD) {
            $_SESSION['is_admin'] = true;
            $_SESSION['admin_user'] = $username;
            return true;
        }
        return false;
    }

    public function logout(): void
    {
        $_SESSION = [];
        
        if (ini_get("session.use_cookies")) {
            $params = session_get_cookie_params();
            setcookie(session_name(), '', time() - 42000,
                $params["path"], $params["domain"],
                $params["secure"], $params["httponly"]
            );
        }

        session_destroy();
    }

    public function isLoggedIn(): bool
    {
        return isset($_SESSION['is_admin']) && $_SESSION['is_admin'] === true;
    }
}