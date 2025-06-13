<?php
// loc-ar/src/AppKernel.php

require_once __DIR__ . '/View.php';
require_once __DIR__ . '/EventManager.php';
require_once __DIR__ . '/Utils.php'; 
/**
 * Inicia y renderiza la aplicación para un cliente específico.
 *
 * @param string $clientId El identificador del cliente.
 */
function launchApp(string $clientId, string $baseUrl)
{
    // 1. Validar y cargar el manifiesto del cliente
    if (!preg_match('/^[a-zA-Z0-9_-]+$/', $clientId)) {
        http_response_code(400);
        die('Error: ID de cliente inválido.');
    }
    $manifestPath = __DIR__ . '/../../public_html/' . $clientId . '/datos/manifest.json';
    if (!file_exists($manifestPath)) {
        http_response_code(404);
        die('Error: Archivo de manifiesto no encontrado.');
    }
    $manifest = json_decode(file_get_contents($manifestPath), true);
    if (json_last_error() !== JSON_ERROR_NONE) {
        http_response_code(500);
        die('Error: El manifiesto contiene un JSON inválido.');
    }

    // 2. Determinar el contexto actual basado en eventos
    $eventManager = new EventManager($manifest['timed_events'] ?? []);
    $activeEventContext = $eventManager->getContext();
    $activeEvent = $activeEventContext['active_event'];

    // 3. Definir el contexto final para la vista (skin, favicon, título)
    $logoName = $manifest['profile_data']['logo'] ?? null;
    $logoUrl = $logoName ? Utils::buildImageUrl($logoName, $clientId, $baseUrl) : null;

    $finalContext = [
        'skin' => $activeEvent['then']['set_skin'] ?? $manifest['default_skin'],
        'favicon' => $baseUrl . ltrim($activeEvent['then']['set_favicon'] ?? $manifest['profile_data']['favicon'], '/'),
        'logo_url' => $logoUrl
    ];
    
    $pageTitle = $manifest['profile_data']['name'];
    if (isset($activeEvent['then']['set_title_suffix'])) {
        $pageTitle .= $activeEvent['then']['set_title_suffix'];
    }

    // 4. Preparar la lista de módulos para el panel de navegación
    $navigableModules = [];
    foreach ($manifest['modules'] as $moduleConfig) {
        if (isset($moduleConfig['show_in_nav']) && $moduleConfig['show_in_nav']) {
            $navigableModules[] = [
                'title' => $moduleConfig['title'],
                'id' => $moduleConfig['id']
            ];
        }
    }

    // 5. [OPTIMIZADO] Renderizar únicamente el módulo activo inicial
    $modulesContent = '';
    $stylesheets = [$baseUrl . "asset/css/{$finalContext['skin']}/main.css"];


    // Determinar el título del módulo a cargar
    $activeModuleTitle = $activeEvent['then']['default_module'] ?? $manifest['default_module'];

    // Encontrar la configuración completa del módulo activo
    $activeModuleConfig = null;
    foreach ($manifest['modules'] as $module) {
        if ($module['title'] === $activeModuleTitle) {
            $activeModuleConfig = $module;
            break;
        }
    }

    // Si encontramos el módulo, lo renderizamos
    if ($activeModuleConfig) {
        $moduleType = $activeModuleConfig['type'];
        $logicPath = __DIR__ . '/modules/' . $moduleType . '.php';

        if (file_exists($logicPath)) {
            require_once $logicPath;
            
            // Obtener los datos específicos del módulo
            $moduleData = get_module_data($activeModuleConfig, $manifest, $activeEventContext, $clientId, $baseUrl);
            
            // Renderizar la plantilla del módulo con sus datos
            $modulesContent = View::render('modules/' . $moduleType, $moduleData);

            // Añadir la hoja de estilos del módulo, si existe
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

    // 6. Preparar el contexto inicial para el JavaScript del frontend
    $initialContextForJs = [
        'profile_title' => $manifest['profile_data']['name'],
        'default_skin' => $manifest['default_skin'],
        'default_favicon' => $manifest['profile_data']['favicon'],
    ];

    // 7. Renderizar la plantilla principal con todos los datos recopilados
   echo View::render('layouts/main', [
        'page_title' => $pageTitle,
        'favicon' => $finalContext['favicon'],
        'logo_url' => $finalContext['logo_url'], // <-- Pasamos la URL del logo
        'stylesheets' => $stylesheets,
        'content' => $modulesContent,
        'client_id' => $clientId,
        'initial_context_json' => json_encode($initialContextForJs),
        'navigable_modules' => $navigableModules,
        'base_url' => $baseUrl,
    ]);
}