<?php
require_once __DIR__ . '/View.php';
require_once __DIR__ . '/EventManager.php';

function launchApp(string $clientId)
{
    if (!preg_match('/^[a-zA-Z0-9_-]+$/', $clientId)) {
        die('Invalid client ID.');
    }
    $manifestPath = __DIR__ . '/../../public_html/' . $clientId . '/datos/manifest.json';
    if (!file_exists($manifestPath)) {
        die('Manifest file not found.');
    }
    $manifest = json_decode(file_get_contents($manifestPath), true);
    
    $eventManager = new EventManager($manifest['timed_events'] ?? []);
    $activeEventContext = $eventManager->getContext();

    $finalContext = [
        'title' => $activeEventContext['active_event']['then']['set_title_suffix'] ?? $manifest['profile_data']['name'],
        'skin' => $activeEventContext['active_event']['then']['set_skin'] ?? $manifest['default_skin'],
        'favicon' => $activeEventContext['active_event']['then']['set_favicon'] ?? $manifest['profile_data']['favicon'],
    ];

    $modulesContent = '';
    // <-- CAMBIO AQUÍ: La nueva ruta para los CSS
    $stylesheets = ["/asset/css/{$finalContext['skin']}/main.css"];

    foreach ($manifest['modules'] as $moduleConfig) {
        $moduleType = $moduleConfig['type'];
        $logicPath = __DIR__ . '/modules/' . $moduleType . '.php';

        if (file_exists($logicPath)) {
            require_once $logicPath;
            $moduleData = get_module_data($moduleConfig, $manifest, $activeEventContext, $clientId);
            $modulesContent .= View::render('modules/' . $moduleType, $moduleData);

            // <-- CAMBIO AQUÍ: La nueva ruta para los CSS de módulos
            $moduleCssPath = "/asset/css/{$finalContext['skin']}/{$moduleType}.css";
            $publicPath = __DIR__ . '/../../public_html' . $moduleCssPath;
            
            if (file_exists($publicPath)) {
                $stylesheets[] = $moduleCssPath;
            }
        }
    }
    
    $initialContextForJs = [
        'profile_title' => $manifest['profile_data']['name'],
        'default_skin' => $manifest['default_skin'],
        'default_favicon' => $manifest['profile_data']['favicon'],
    ];

    echo View::render('layouts/main', [
        'page_title' => $finalContext['title'],
        'favicon' => $finalContext['favicon'],
        'stylesheets' => $stylesheets,
        'content' => $modulesContent,
        'client_id' => $clientId,
        'initial_context_json' => json_encode($initialContextForJs)
    ]);
}