<?php
require_once __DIR__ . '/api_bootstrap.php';

$authManager = new \Admin\AuthManager();
if (!$authManager->isLoggedIn()) {
    send_json_response(false, 'Acceso no autorizado.', null, 403);
}

$menuData = $input['menuData'] ?? null;
$dataSource = $input['dataSource'] ?? null;

if (!$menuData || !$dataSource) {
    send_json_response(false, 'Faltan datos esenciales (menuData o dataSource).', null, 400);
}

$fileName = basename($dataSource);
$fullPath = DATA_PATH . '/' . $fileName;

$realDataPath = realpath(DATA_PATH);
$realTargetDir = realpath(dirname($fullPath));

if ($realDataPath === false || $realTargetDir === false || $realDataPath !== $realTargetDir) {
    send_json_response(false, 'Ruta de archivo no válida o insegura.', null, 400);
}
$backupDir = DATA_PATH . '/_backups';
if (!is_dir($backupDir)) {
    if (!mkdir($backupDir, 0775, true)) {
        send_json_response(false, 'No se pudo crear el directorio de backups.', null, 500);
    }
}
$backupFile = $backupDir . '/' . pathinfo($fileName, PATHINFO_FILENAME) . '-' . date("YmdHis") . '.json';
if (file_exists($fullPath)) {
    copy($fullPath, $backupFile);
}

$newJsonData = json_encode($menuData, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

if (file_put_contents($fullPath, $newJsonData) === false) {
    send_json_response(false, 'No se pudo escribir en el archivo de datos. Verifica los permisos.', null, 500);
}

send_json_response(true, 'Menú guardado con éxito.');