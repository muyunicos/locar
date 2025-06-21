<?php

require_once(dirname(__DIR__, 4) . '/core/test/src/bootstrap.php');

if (!defined('CLIENT_ID')) {
    define('CLIENT_ID', $_GET['client'] ?? 'test');
}
if (!defined('DEV_BRANCH')) {
    define('DEV_BRANCH', $_GET['dev'] ?? 'test');
}

require_once(dirname(__DIR__, 4) . '/core/' . DEV_BRANCH . '/src/Config.php');
require_once(PRIVATE_PATH . '/src/admin/AuthManager.php');

$authManager = new AuthManager();
$authManager->logout();

$redirectUrl = $_GET['redirect_url'] ?? null;

if (empty($redirectUrl)) {
    $redirectUrl = CLIENT_URL ?? '/';
}

header('Location: ' . $redirectUrl);
exit();