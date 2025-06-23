<?php
// api/saveMenu.php

// 1. INCLUIR EL BOOTSTRAP
// Esto nos da acceso a $input, AuthManager, y las constantes como DATA_PATH.
require_once __DIR__ . '/api_bootstrap.php';

// 2. AÑADIR AUTENTICACIÓN (MEJORA DE SEGURIDAD CRÍTICA)
// Verificamos si el usuario ha iniciado sesión antes de permitir cualquier modificación.
$authManager = new AuthManager();
if (!$authManager->isLoggedIn()) {
    // Usamos la función helper de api_bootstrap.php para enviar la respuesta
    send_json_response(false, 'Acceso no autorizado.', null, 403);
}

// 3. USAR LA VARIABLE GLOBAL $input
// La variable $input ya contiene los datos de la petición, no es necesario volver a decodificarlos.
$menuData = $input['menuData'] ?? null;
$dataSource = $input['dataSource'] ?? null;

if (!$menuData || !$dataSource) {
    send_json_response(false, 'Faltan datos esenciales (menuData o dataSource).', null, 400);
}

// 4. USAR RUTA DE ARCHIVOS SEGURA CON DATA_PATH (CORRECCIÓN CLAVE)
// Usamos la constante DATA_PATH (definida en Config.php) como la única base permitida.
// Usamos basename() para asegurarnos de que solo estamos usando el nombre del archivo, evitando ataques de Directory Traversal.
$fileName = basename($dataSource);
$fullPath = DATA_PATH . '/' . $fileName;

// Verificamos que el archivo de destino realmente exista dentro del directorio de datos.
if (strpos(realpath($fullPath), realpath(DATA_PATH)) !== 0) {
    send_json_response(false, 'Ruta de archivo no válida o insegura.', null, 400);
}

// --- Lógica de Backup (sin cambios, ya era correcta) ---
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

// --- Guardar el nuevo contenido (sin cambios) ---
$newJsonData = json_encode($menuData, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

if (file_put_contents($fullPath, $newJsonData) === false) {
    send_json_response(false, 'No se pudo escribir en el archivo de datos.', null, 500);
}

// Si todo salió bien
send_json_response(true, 'Menú guardado con éxito.');