<?php
$host = $_SERVER['HTTP_HOST'] ?? 'loc.ar';

if (strpos($host, 'www.') === 0) {
    $host = substr($host, 4);
}

if (substr_count($host, '.') > 1) {
    $domain_parts = explode('.', $host);
    $main_domain = array_slice($domain_parts, -2, 2);
    $cookie_domain = '.' . implode('.', $main_domain);
} else {
    $cookie_domain = '.' . $host;
}

if ($host === 'localhost') {
    $cookie_domain = null;
}

session_set_cookie_params([
    'lifetime' => 0,
    'path' => '/',
    'domain' => $cookie_domain,
    'secure' => true,
    'httponly' => true,
    'samesite' => 'Lax'
]);

session_start();