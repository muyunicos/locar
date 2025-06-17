<?php

define('BASE_URL', 'https://loc.ar/');

require_once __DIR__ . '/View.php';
require_once __DIR__ . '/EventManager.php';
require_once __DIR__ . '/Utils.php';

function launchApp()
{
    $manifestPath = __DIR__ . '/../../public_html/' . CLIENT_ID . '/datos/manifest.json';
    if (!file_exists($manifestPath)) {
        http_response_code(404);
        die('Error: Archivo de manifiesto no encontrado.');
    }

    $manifest = json_decode(file_get_contents($manifestPath), true);
    if (json_last_error() !== JSON_ERROR_NONE) {
        http_response_code(500);
        die('Error: El manifiesto contiene un JSON inválido.');
    }

    $pageTitle = $manifest['titulo'];
    $pageName = $manifest['nombre'];

    $eventManager = new EventManager($manifest['eventos'] ?? []);
    $activeEventContext = $eventManager->getContext();
    $activeEvent = $activeEventContext['active_event'];

    $logoUrl = Utils::buildImageUrl($activeEvent['cambios']['logo'] ?? $manifest['logo']);
    $favicon = Utils::buildImageUrl($activeEvent['cambios']['favicon'] ?? $manifest['favicon']);
    $mainSkin = $activeEvent['cambios']['skin'] ?? $manifest['skin'];
    

    if (isset($activeEvent['cambios']['sufijo'])) {
        $pageTitle .= $activeEvent['cambios']['sufijo'];
    }

    $navigableModules = [];
    foreach ($manifest['modulos'] as $moduleConfig) {
        if (isset($moduleConfig['navegacion']) && $moduleConfig['navegacion']) {
            $navigableModules[] = [
                'title' => $moduleConfig['titulo'],
                'id' => $moduleConfig['id'],
                'type' => $moduleConfig['tipo'],
                'url' => $moduleConfig['url'] ?? null
            ];
        }
    }

    $content = '';
    $activeModuleConfig = null;
    $activeModuleId = $activeEvent['cambios']['modulo'] ?? $manifest['modulo'];
    foreach ($manifest['modulos'] as $module) {
        if ($module['id'] === $activeModuleId) {
            $activeModuleConfig = $module;
            break;
        }
    }

if ($activeModuleConfig) {
        $moduleType = $activeModuleConfig['tipo'];
        $logicPath = __DIR__ . '/modules/' . $moduleType . '.php';

        if (file_exists($logicPath)) {
            require_once $logicPath;

            $moduleData = get_module_data($activeModuleConfig, $activeEventContext);
            
            $moduleSkin = $moduleData['skin'] ?? $mainSkin;
            $moduleStylesheet = BASE_URL . "/test/asset/css/{$moduleSkin}/{$moduleType}.css";
            if (isset($moduleData['main_skin']) && $moduleData['main_skin'] && !isset($activeEvent['cambios']['skin'])) {
                $mainSkin = $moduleData['skin'] ?? $mainSkin;
                }
            $content = View::render('modules/' . $moduleType, $moduleData);

        } else {
            $content = "<div class='app-error'>Error: No se encontró la lógica para el módulo de tipo '{$moduleType}'.</div>";
        }
    } else {
        $content = "<div class='app-error'>Error: El módulo por defecto '{$activeModuleId}' no fue encontrado en el manifiesto.</div>";
    }
    $mainStylesheet = BASE_URL . "test/asset/css/{$mainSkin}/main.css";
   echo View::render('layouts/main', [
        'page_title' => $pageTitle,
        'favicon' => $favicon,
        'logo_url' => $logoUrl,
        'main_stylesheet' => $mainStylesheet,
        'module_stylesheet' => $moduleStylesheet,
        'content' => $content,
        'client_id' => CLIENT_ID,
        'base_url' => BASE_URL,
        'navigable_modules' => $navigableModules
    ]);
}