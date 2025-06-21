<?php

if (session_status() == PHP_SESSION_NONE) {

    $host = $_SERVER['HTTP_HOST'] ?? 'loc.ar';
    $cookie_domain = null;

    if ($host !== 'localhost') {
        if (strpos($host, 'www.') === 0) {
            $host = substr($host, 4);
        }

        if (substr_count($host, '.') >= 1) {
            $domain_parts = explode('.', $host);
            $root_domain = array_slice($domain_parts, -2, 2);
            $cookie_domain = '.' . implode('.', $root_domain);
        }
    }

    session_set_cookie_params([
        'lifetime' => 0,
        'path' => '/',
        'domain' => $cookie_domain,
        'secure' => isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on',
        'httponly' => true,
        'samesite' => 'Lax'
    ]);

    session_start();
}