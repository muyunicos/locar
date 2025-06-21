<?php
session_start();

define('CLIENT_ID', $_GET['client'] ?? 'test');
define('DEV_BRANCH', $_GET['dev'] ?? 'test');

require_once(dirname(__DIR__, 4) . '/core/' . DEV_BRANCH . '/src/Config.php');
require_once(PRIVATE_PATH . '/src/admin/AuthManager.php');

$authManager = new AuthManager();
$authManager->logout();

header('Location: /');
exit();