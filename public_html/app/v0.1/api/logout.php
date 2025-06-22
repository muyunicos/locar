<?php

require_once __DIR__ . '/api_bootstrap.php';

$authManager = new AuthManager();
$authManager->logout();

$redirectUrl = $_GET['redirect_url'] ?? null;

if (empty($redirectUrl)) {
    $redirectUrl = CLIENT_URL ?? '/';
}

header('Location: ' . $redirectUrl);
exit();