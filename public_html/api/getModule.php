<?php
// public_html/api/getModule.php

// Requerimos los componentes principales
require_once __DIR__ . '/../../loc-ar/src/View.php';
require_once __DIR__ . '/../../loc-ar/src/EventManager.php';

// --- 1. Validaciones y Carga del Manifiesto ---
$clientId = $_GET['client'] ?? '';
$moduleId = $_GET['id'] ?? '';

if (!preg_match('/^[a-zA-Z0-9_-]+$/', $clientId) || !preg_match('/^[a-zA-Z0-9_-]+$/', $moduleId)) {
    http_response_code(400);
    die('Error: ID de cliente o módulo inválido.');
}

$manifestPath = __DIR__ . '/../' . $clientId . '/datos/manifest.json';
if (!file_exists($manifestPath)) {
    http_response_code(404);
    die('Error: Manifiesto no encontrado.');
}
$manifest = json_decode(file_get_contents($manifestPath), true);

// --- 2. Encontrar la Configuración del Módulo Solicitado ---
$moduleConfig = null;
foreach ($manifest['modules'] as $module) {
    if ((string)$module['id'] === $moduleId) {
        $moduleConfig = $module;
        break;
    }
}

if (!$moduleConfig) {
    http_response_code(404);
    die("<div class='app-error'>Error: Módulo con ID '{$moduleId}' no encontrado.</div>");
}

// --- 3. Renderizar el Módulo ---
$moduleType = $moduleConfig['type'];
$logicPath = __DIR__ . '/../../loc-ar/src/modules/' . $moduleType . '.php';

if (file_exists($logicPath)) {
    require_once $logicPath;

    // Aunque no lo usemos para el menú, es bueno tener el contexto de eventos por si un módulo lo necesita
    $eventManager = new EventManager($manifest['timed_events'] ?? []);
    $activeEventContext = $eventManager->getContext();

    // Obtenemos los datos y renderizamos
    $moduleData = get_module_data($moduleConfig, $manifest, $activeEventContext, $clientId);
    echo View::render('modules/' . $moduleType, $moduleData);
} else {
    http_response_code(500);
    echo "<div class='app-error'>Error: No se encontró la lógica para el módulo de tipo '{$moduleType}'.</div>";
}