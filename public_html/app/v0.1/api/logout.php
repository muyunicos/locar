<?php
require_once __DIR__ . '/api_bootstrap.php';
use Admin\AuthManager;

$authManager = new AuthManager();
$authManager->logout();

$redirectUrl = CLIENT_URL ?? '/';

header('Location: ' . $redirectUrl);
exit();