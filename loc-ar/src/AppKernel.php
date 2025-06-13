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

    $eventManager = new EventManager($manifest['timed_events'] ?? []);
    $activeEventContext = $eventManager->getContext();
    $activeEvent = $activeEventContext['active_event'];

    $logoName = $manifest['profile_data']['logo'] ?? null;
    $logoUrl = $logoName ? Utils::buildImageUrl($logoName) : null;

    $finalContext = [
        'skin' => $activeEvent['then']['set_skin'] ?? $manifest['default_skin'],
        'favicon' => $baseUrl . ltrim($activeEvent['then']['set_favicon'] ?? $manifest['profile_data']['favicon'], '/'),
        'logo_url' => $logoUrl
    ];
    
    $pageTitle = $manifest['profile_data']['name'];
    if (isset($activeEvent['then']['set_title_suffix'])) {
        $pageTitle .= $activeEvent['then']['set_title_suffix'];
    }

    $navigableModules = [];
    foreach ($manifest['modules'] as $moduleConfig) {
        if (isset($moduleConfig['show_in_nav']) && $moduleConfig['show_in_nav']) {
            $navigableModules[] = [
                'title' => $moduleConfig['title'],
                'id' => $moduleConfig['id']
            ];
        }
    }

    $modulesContent = '';
    $stylesheets = [$baseUrl . "asset/css/{$finalContext['skin']}/main.css"];

    $activeModuleTitle = $activeEvent['then']['default_module'] ?? $manifest['default_module'];

    $activeModuleConfig = null;
    foreach ($manifest['modules'] as $module) {
        if ($module['title'] === $activeModuleTitle) {
            $activeModuleConfig = $module;
            break;
        }
    }

if ($activeModuleConfig) {
        $moduleType = $activeModuleConfig['type'];
        $logicPath = __DIR__ . '/modules/' . $moduleType . '.php';

        if (file_exists($logicPath)) {
            require_once $logicPath;
            $moduleData = get_module_data($activeModuleConfig, $manifest, $activeEventContext);
            $modulesContent = View::render('modules/' . $moduleType, $moduleData);
            $moduleCssPath = "/asset/css/{$finalContext['skin']}/{$moduleType}.css";
            if (file_exists(__DIR__ . '/../../public_html' . $moduleCssPath)) {
                 $stylesheets[] = $baseUrl . ltrim($moduleCssPath, '/');
            }
        } else {
            $modulesContent = "<div class='app-error'>Error: No se encontró la lógica para el módulo de tipo '{$moduleType}'.</div>";
        }
    } else {
        $modulesContent = "<div class='app-error'>Error: El módulo por defecto '{$activeModuleTitle}' no fue encontrado en el manifiesto.</div>";
    }

    $initialContextForJs = [
        'profile_title' => $manifest['profile_data']['name'],
        'default_skin' => $manifest['default_skin'],
        'default_favicon' => $manifest['profile_data']['favicon'],
    ];

   echo View::render('layouts/main', [
        'page_title' => $pageTitle,
        'favicon' => $finalContext['favicon'],
        'logo_url' => $finalContext['logo_url'],
        'stylesheets' => $stylesheets,
        'content' => $modulesContent,
        'client_id' => CLIENT_ID,
        'base_url' => BASE_URL,
        'navigable_modules' => $navigableModules,
    ]);
}