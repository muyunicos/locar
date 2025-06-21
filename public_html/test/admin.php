<?php
session_start();

define('CLIENT_ID', basename(__DIR__));
define('DEV_BRANCH', 'test');

require_once(dirname(__DIR__,2) . '/core/' . DEV_BRANCH . '/src/Config.php');
require_once(PRIVATE_PATH . '/src/admin/AuthManager.php');
require_once(PRIVATE_PATH . '/src/View.php');

$authManager = new AuthManager();

$action = $_GET['action'] ?? 'show_login';

switch ($action) {
    case 'login_attempt':
        $username = $_POST['username'] ?? '';
        $password = $_POST['password'] ?? '';
        
        if ($authManager->login($username, $password)) {
            header('Location: index.php');
            exit();
        } else {
            $error = "Usuario o contraseña incorrectos.";
            echo View::render('admin/login', ['error' => $error]);
        }
        break;

    case 'logout':
        $authManager->logout();
        header('Location: admin.php');
        exit();

    case 'show_login':
    default:
        if ($authManager->isLoggedIn()) {
            header('Location: index.php');
            exit();
        }
        echo View::render('admin/login', []);
        break;
}