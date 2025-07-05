<?php

$allowed_origin_pattern = '/^https?:\/\/(?:.+\.)?loc\.ar$/';

$base_dir = dirname(__DIR__);
$allowed_asset_dir = $base_dir . '/assets/js/';

$allowed_extensions = ['js'];

// --- CORRECCIÓN DE SEGURIDAD ---
// 1. Obtén el parámetro 'file' sin basename()
$requested_file = isset($_GET['file']) ? $_GET['file'] : '';

// 2. Reemplaza basename() con una comprobación que previene "directory traversal" (..)
if (empty($requested_file) || strpos($requested_file, '..') !== false) {
    header("HTTP/1.1 400 Bad Request");
    exit('Petición inválida.');
}
// ------------------------------

// Esta parte ya no es necesaria aquí porque se hace arriba
// $file_extension = pathinfo($requested_file, PATHINFO_EXTENSION);
// if (empty($requested_file) || !in_array($file_extension, $allowed_extensions) || strpos($requested_file, '.') === 0) { ... }
// La hemos simplificado e integrado en la nueva comprobación.

$full_path = $allowed_asset_dir . $requested_file;
if (!file_exists($full_path)) {
    header("HTTP/1.1 404 Not Found");
    exit('Archivo no encontrado: ' . htmlspecialchars($full_path, ENT_QUOTES, 'UTF-8'));
}

// La lógica de CORS también está bien.
if (isset($_SERVER['HTTP_ORIGIN']) && preg_match($allowed_origin_pattern, $_SERVER['HTTP_ORIGIN'])) {
    header('Access-Control-Allow-Origin: ' . $_SERVER['HTTP_ORIGIN']);
    header('Access-Control-Allow-Credentials: true');
    header('Vary: Origin');
}

// Servir el archivo.
header('Content-Type: application/javascript');
header('Content-Length: ' . filesize($full_path));
readfile($full_path);

exit();