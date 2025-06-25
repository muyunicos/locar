<?php

if (!defined('VERSION')) {
    $uri_path = $_SERVER['REQUEST_URI'] ?? '';
    if (preg_match('/^\/app\/([a-zA-Z0-9_-]+)\/api\//', $uri_path, $matches)) {
        define('VERSION', $matches[1]);
    } else {
        define('VERSION', '');
    }
}

if (!defined('DEV')) {
    if (VERSION !== '') {
        define('DEV', false);
    } else {
    define('DEV', true);
    }
}

if (DEV) {
    ini_set('display_errors', 1);
    error_reporting(E_ALL);
    global $dev_logs;
    $dev_logs = [];

    function log_dev_message($message) {
        global $dev_logs;
        if (is_array($dev_logs)) {
            $dev_logs[] = '[' . date('H:i:s') . '] ' . $message;
        }
    }

} else {
    ini_set('display_errors', 0);
    error_reporting(E_ALL & ~E_NOTICE & ~E_DEPRECATED);

    if (!function_exists('log_dev_message')) {
        function log_dev_message($message) {
        }
    }
}

require_once __DIR__ . '/config.php';

if (defined('DEV') && DEV) {
    log_dev_message("DEBUG: PRIVATE_PATH en bootstrap.php: " . PRIVATE_PATH);
}

spl_autoload_register(function ($class_name) {
    $namespaces_map = [
        'Core\\' => PRIVATE_PATH . '/src/',
        'App\\'  => PUBLIC_PATH . '/api/',
        'Admin\\'  => PRIVATE_PATH . '/src/admin/',
    ];

    foreach ($namespaces_map as $namespace_prefix => $base_dir) {
        if (strpos($class_name, $namespace_prefix) === 0) {
            $relative_class = substr($class_name, strlen($namespace_prefix));
            $file = $base_dir . str_replace('\\', DIRECTORY_SEPARATOR, $relative_class) . '.php';
            log_dev_message("Autoloader: Intentando cargar {$class_name} desde {$file}");
            if (file_exists($file)) {
                require_once $file;
                log_dev_message("Autoloader: Clase {$class_name} cargada exitosamente.");
                return;
            }
        }
    }
    log_dev_message("Autoloader: No se pudo encontrar la clase {$class_name}.");
});

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