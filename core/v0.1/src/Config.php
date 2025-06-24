<?php

    if (!defined('CLIENT_ID')) {
        
        $client_id_found = '';

        if (isset($_GET['client_id']) && !empty($_GET['client_id'])) {
            $client_id_found = htmlspecialchars($_GET['client_id']);
        }

        else {
            $host = $_SERVER['HTTP_HOST'] ?? '';
            $uri_path = $_SERVER['REQUEST_URI'] ?? '';
            if (strpos($host, '.loc.ar') !== false && $host !== 'loc.ar') {
                $client_id_parts = explode('.', $host);
                if (count($client_id_parts) >= 2) {
                    $client_id_found = $client_id_parts[0];
                }
            }

            else if (empty($client_id_found) && preg_match('/^\/([a-zA-Z0-9_-]+)(?:\/|$)/', $uri_path, $matches)) {
                $possible_client_id = $matches[1];
                if ($possible_client_id !== 'app' && $possible_client_id !== 'api' && $possible_client_id !== 'core') {
                     $client_id_found = $possible_client_id;
                }
            }
        }

        define('CLIENT_ID', $client_id_found);
        
    }

    log_dev_message("CLIENT_ID final definido como: " . (empty(CLIENT_ID) ? '[vacío]' : CLIENT_ID));

    $base_locar_path = DEV ? dirname(__DIR__,3) : dirname(__DIR__,2);

    if (!empty(CLIENT_ID)) {
        define('CLIENT_PATH', $base_locar_path . '/public_html/' . CLIENT_ID);
        define('DATA_PATH', CLIENT_PATH . '/datos');
    } else {
        define('CLIENT_PATH', $base_locar_path . '/public_html/test');
        define('DATA_PATH', CLIENT_PATH . '/datos');
        error_log("Warning: CLIENT_ID no determinado, se utilizan rutas del cliente de pruebas 'test' predeterminadas.");
    }

    define('PUBLIC_PATH', $base_locar_path . '/public_html/app' . (DEV ? '/' . DEV_BRANCH : ''));
    log_dev_message("PUBLIC_PATH: " . PUBLIC_PATH);
    
    
    define('PRIVATE_PATH', dirname(__DIR__));
    log_dev_message("PRIVATE_PATH: " . PRIVATE_PATH);

    define('PUBLIC_URL', 'https://loc.ar/app' . (DEV ? '/' . DEV_BRANCH : ''));
    log_dev_message("PUBLIC_URL: " . PUBLIC_URL);