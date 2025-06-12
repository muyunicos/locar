<?php
require_once __DIR__ . '/View.php';
require_once __DIR__ . '/EventManager.php'; // Incluimos el nuevo motor

function launchApp(string $clientId)
{
    if (!preg_match('/^[a-zA-Z0-9_-]+$/', $clientId)) {
        die('Invalid client ID.');
    }
    $manifestPath = __DIR__ . '/../../public_html/' . $clientId . '/datos/manifest.json';
    $manifest = json_decode(file_get_contents($manifestPath), true);
    
    // 1. Crear el motor de eventos y obtener el contexto final
    $eventManager = new EventManager($manifest);
    $context = $eventManager->getContext();

    // 2. Preparar el contenido de los módulos
    $modulesContent = '';
    $stylesheets = ["/skins/{$context['skin']}/main.css"];

    foreach ($manifest['modules'] as $moduleConfig) {
        $moduleType = $moduleConfig['type'];
        $logicPath = __DIR__ . '/modules/' . $moduleType . '.php';

        if (file_exists($logicPath)) {
            require_once $logicPath;
            // Pasamos el contexto completo a la lógica del módulo
            $moduleData = get_module_data($moduleConfig, $manifest, $context, $clientId);
            $modulesContent .= View::render('modules/' . $moduleType, $moduleData);

            $moduleCssPath = "/skins/{$context['skin']}/{$moduleType}.css";
            if (file_exists(__DIR__ . '/../public_html' . $moduleCssPath)) {
                $stylesheets[] = $moduleCssPath;
            }
        }
    }
    
    // 3. Renderizamos la vista principal con el contexto final
    echo View::render('layouts/main', [
        'page_title' => $context['title'],
        'favicon' => $context['favicon'],
        'stylesheets' => $stylesheets,
        'content' => $modulesContent,
        'event_rules' => $manifest['timed_events'] ?? [] // Pasamos las reglas a JS
    ]);
}