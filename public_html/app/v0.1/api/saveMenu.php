<?php

require_once 'api_bootstrap.php';

global $input; 

$authManager = new AuthManager();
if (!$authManager->isLoggedIn()) {
    http_response_code(403);
    echo json_encode(['success' => false, 'message' => 'Acceso denegado.']);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Método no permitido.']);
    exit;
}

if (!isset($input['menuData']) || !isset($input['dataSourceFile'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Datos de entrada inválidos o incompletos.']);
    exit;
}

$menuData = $input['menuData'];
$dataSourceFile = basename($input['dataSourceFile']);

$basePath = realpath(DATA_PATH);
$filePath = $basePath . '/' . $dataSourceFile;

if (strpos(realpath($filePath), $basePath) !== 0 || !is_writable($basePath)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Archivo de destino no válido o sin permisos.']);
    exit;
}

try {
    $backupDir = $basePath . '/_backups';
    if (!is_dir($backupDir)) {
        mkdir($backupDir, 0775, true);
    }
    $backupFileName = pathinfo($filePath, PATHINFO_FILENAME) . '-' . date('YmdHis') . '.json';
    $backupPath = $backupDir . '/' . $backupFileName;
    
    if (file_exists($filePath) && !copy($filePath, $backupPath)) {
        throw new Exception('No se pudo crear el archivo de respaldo.');
    }
} catch (Exception $e) {
    http_response_code(500);
    error_log('Error de backup: ' . $e->getMessage());
    echo json_encode(['success' => false, 'message' => 'Error crítico: no se pudo crear el respaldo. No se guardaron los cambios.']);
    exit;
}

$jsonData = json_encode($menuData, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
if (file_put_contents($filePath, $jsonData) === false) {
    http_response_code(500);
    error_log('Error de escritura en: ' . $filePath);
    echo json_encode(['success' => false, 'message' => 'Error al escribir en el archivo de datos.']);
    exit;
}

echo json_encode(['success' => true, 'message' => 'Menú guardado correctamente.']);