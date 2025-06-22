<?php

require_once __DIR__ . '/api_bootstrap.php';
global $input; 

$authManager = new AuthManager();
if (!$authManager->isLoggedIn()) {
    send_json_response(false, 'Acceso denegado.', null, 403);
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    send_json_response(false, 'Método no permitido.', null, 405);
}

if (!isset($input['menuData']) || !isset($input['dataSource'])) {
    send_json_response(false, 'Datos de entrada inválidos o incompletos.', null, 400);
}

$menuData = $input['menuData'];
$dataSourceFile = basename($input['dataSource']);

$basePath = realpath(DATA_PATH);
$filePath = $basePath . '/' . $dataSourceFile;


if (!is_writable($basePath)) {
    send_json_response(false, 'Error de permisos: El directorio de datos no es escribible.', null, 500);
}

if (file_exists($filePath) && strpos(realpath($filePath), $basePath) !== 0) {
    send_json_response(false, 'Operación no permitida: la ruta del archivo es insegura.', null, 400);
}

if (dirname($filePath) !== $basePath) {
    send_json_response(false, 'Operación no permitida: intento de escribir fuera del directorio de datos.', null, 400);
}

try {
    $backupDir = $basePath . '/_backups';
    if (!is_dir($backupDir)) {
        mkdir($backupDir, 0775, true);
    }
    
    if (file_exists($filePath)) {
        $backupFileName = pathinfo($filePath, PATHINFO_FILENAME) . '-' . date('YmdHis') . '.json';
        $backupPath = $backupDir . '/' . $backupFileName;
        if (!copy($filePath, $backupPath)) {
            throw new Exception('No se pudo crear el archivo de respaldo.');
        }
    }
} catch (Exception $e) {
    error_log('Error de backup: ' . $e->getMessage());
    send_json_response(false, 'Error crítico: no se pudo crear el respaldo. No se guardaron los cambios.', null, 500);
}

$jsonData = json_encode($menuData, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
if (file_put_contents($filePath, $jsonData) === false) {
    error_log('Error de escritura en: ' . $filePath);
    send_json_response(false, 'Error al escribir en el archivo de datos.', null, 500);
}

send_json_response(
    true, 
    'Menú guardado correctamente.', 
    ['savedData' => $menuData]
);