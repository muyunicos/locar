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
    $logoUrl = Utils::buildImageUrl($manifest['profile_data']['logo']);
    $favicon = Utils::buildImageUrl($manifest['profile_data']['favicon']);
    $globalSkin = $activeEvent['then']['set_skin'] ?? $manifest['default_skin'];

    $finalContext = [
        'skin' => $activeEvent['then']['set_skin'] ?? $manifest['default_skin'],
        'favicon' => BASE_URL . CLIENT_ID . '/imagenes/' . ltrim($manifest['profile_data']['favicon']),
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
    $stylesheets = [BASE_URL . "asset/css/{$globalSkin}/main.css"];
    $moduleStylesheet = null;

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
            
            $moduleSkin = $moduleData['skin'] ?? $globalSkin;
            $moduleCssPath = "/asset/css/{$moduleSkin}/{$moduleType}.css";

            if (file_exists(__DIR__ . '/../../public_html' . $moduleCssPath)) {
                 $moduleStylesheet = BASE_URL . ltrim($moduleCssPath, '/');
            }

            $modulesContent = View::render('modules/' . $moduleType, $moduleData);

        } else {
            $modulesContent = "<div class='app-error'>Error: No se encontró la lógica para el módulo de tipo '{$moduleType}'.</div>";
        }
    } else {
        $modulesContent = "<div class='app-error'>Error: El módulo por defecto '{$activeModuleTitle}' no fue encontrado en el manifiesto.</div>";
    }

     $initialContextForJs = [
        'profile_title' => $pageTitle,
        'default_skin' => $globalSkin,
        'default_favicon' => $favicon,

    ];

   echo View::render('layouts/main', [
        'page_title' => $pageTitle,
        'favicon' => $favicon,
        'logo_url' => $logoUrl,
        'stylesheets' => $stylesheets,
        'module_stylesheet' => $moduleStylesheet,
        'content' => $modulesContent,
        'client_id' => CLIENT_ID,
        'base_url' => BASE_URL,
        'navigable_modules' => $navigableModules,
        'initial_context_json' => json_encode($initialContextForJs, JSON_HEX_TAG | JSON_HEX_APOS | JSON_HEX_QUOT)
    ]);
}