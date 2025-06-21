<?php

require_once '../../../../core/test/src/bootstrap.php';

$authManager = new \App\Admin\AuthManager();
if (!$authManager->isAdmin()) {
    header('Content-Type: application/json', true, 403); // Forbidden
    echo json_encode(['success' => false, 'message' => 'Acceso denegado.']);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    header('Content-Type: application/json', true, 405); // Method Not Allowed
    echo json_encode(['success' => false, 'message' => 'Método no permitido.']);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true);

if (json_last_error() !== JSON_ERROR_NONE || !isset($input['menuData']) || !isset($input['dataSourceFile'])) {
    header('Content-Type: application/json', true, 400); // Bad Request
    echo json_encode(['success' => false, 'message' => 'Datos de entrada inválidos o incompletos.']);
    exit;
}

$menuData = $input['menuData'];
$dataSourceFile = basename($input['dataSourceFile']);

$basePath = realpath(DATA_PATH);
$filePath = $basePath . '/' . $dataSourceFile;

if (strpos(realpath($filePath), $basePath) !== 0 || !is_writable($basePath)) {
    header('Content-Type: application/json', true, 400);
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
    
    if (!copy($filePath, $backupPath)) {
        throw new Exception('No se pudo crear el archivo de respaldo.');
    }
} catch (Exception $e) {
    header('Content-Type: application/json', true, 500); // Internal Server Error
    error_log('Error de backup: ' . $e->getMessage());
    echo json_encode(['success' => false, 'message' => 'Error crítico: no se pudo crear el respaldo. No se guardaron los cambios.']);
    exit;
}

$jsonData = json_encode($menuData, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
if (file_put_contents($filePath, $jsonData) === false) {
    header('Content-Type: application/json', true, 500);
    error_log('Error de escritura en: ' . $filePath);
    echo json_encode(['success' => false, 'message' => 'Error al escribir en el archivo de datos.']);
    exit;
}

header('Content-Type: application/json');
echo json_encode(['success' => true, 'message' => 'Menú guardado correctamente.']);