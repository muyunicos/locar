<?php

define ('CLIENT_URL', str_starts_with($_SERVER['HTTP_HOST'], CLIENT_ID . '.') ? "https://" . $_SERVER['HTTP_HOST'] : "https://" . $_SERVER['HTTP_HOST'] . '/' . CLIENT_ID );

require_once __DIR__ . "/Config.php";
require_once PRIVATE_PATH . "/src/View.php";
require_once PRIVATE_PATH . "/src/EventManager.php";
require_once PRIVATE_PATH . "/src/Utils.php";
require_once PRIVATE_PATH . "/src/ModuleLoader.php";

function launchApp()
{
    $manifestPath = CLIENT_PATH . "/datos/manifest.json";
    if (!file_exists($manifestPath)) {
        http_response_code(404);
        die("Error: Archivo de manifiesto no encontrado en $manifestPath .");
    }

    $manifest = json_decode(file_get_contents($manifestPath), true);
    if (json_last_error() !== JSON_ERROR_NONE) {
        http_response_code(500);
        die("Error: El manifiesto contiene un JSON inválido.");
    }

    $pageTitle = $manifest["titulo"];
    $pageName = $manifest["nombre"];

    $eventManager = new EventManager($manifest["eventos"] ?? []);
    $activeEventContext = $eventManager->getContext();
    $activeEvent = $activeEventContext["active_event"];

    $logoUrl = Utils::buildImageUrl(
        $activeEvent["cambios"]["logo"] ?? $manifest["logo"]
    );
    $favicon = Utils::buildImageUrl(
        $activeEvent["cambios"]["favicon"] ?? $manifest["favicon"]
    );
    
    $mainSkin = $activeEvent["cambios"]["skin"] ?? $manifest["skin"];

    $navigableModules = [];
    foreach ($manifest["modulos"] as $moduleConfig) {
        if (isset($moduleConfig["navegacion"]) && $moduleConfig["navegacion"]) {
            $navigableModules[] = [
                "title" => $moduleConfig["titulo"],
                "id" => $moduleConfig["id"],
                "type" => $moduleConfig["tipo"],
                "url" => $moduleConfig["url"] ?? null,
            ];
        }
    }

    $moduleLoader = new ModuleLoader($manifest, $activeEventContext);
    $activeModuleId = $activeEvent["cambios"]["modulo"] ?? $manifest["modulo"];
    $moduleResult = $moduleLoader->loadById($activeModuleId);

    if (isset($activeEvent["cambios"]["sufijo"])) {
            $pageTitle .= $activeEvent["cambios"]["sufijo"];
        } else {
            $pageTitle .= $moduleResult['sufijo'];
        }

    $content = $moduleResult['html'];
    $moduleStylesheet = $moduleResult['css_url'];
    
    if ($moduleResult['main_skin_override'] && empty($activeEvent["cambios"]["skin"])) {
        $mainSkin = $moduleResult['skin'];
    }

    $mainStylesheet = PUBLIC_URL . "/assets/css/{$mainSkin}/main.css";

    $initialContextForJs = [
        "profile_title" => $manifest["titulo"],
        "default_skin" => $manifest["skin"],
        "default_favicon" => $manifest["favicon"],
    ];

    echo View::render("layouts/main", [
        "page_title" => $pageTitle,
        "favicon" => $favicon,
        "logo_url" => $logoUrl,
        "main_stylesheet" => $mainStylesheet,
        "module_stylesheet" => $moduleStylesheet,
        "content" => $content,
        "client_id" => CLIENT_ID,
        "dev_id" => DEV_BRANCH,
        "public_url" => PUBLIC_URL,
        "client_url" => CLIENT_URL,
        "navigable_modules" => $navigableModules,
        "initial_context_json" => json_encode(
            $initialContextForJs,
            JSON_HEX_TAG | JSON_HEX_APOS | JSON_HEX_QUOT
        ),
    ]);
}