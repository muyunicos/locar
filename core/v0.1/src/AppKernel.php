<?php

require_once __DIR__ . '/bootstrap.php';

define ('CLIENT_URL', str_starts_with($_SERVER['HTTP_HOST'], CLIENT_ID . '.') ? "https://" . $_SERVER['HTTP_HOST'] : "https://" . $_SERVER['HTTP_HOST'] . '/' . CLIENT_ID );

require_once __DIR__ . "/Config.php";
require_once PRIVATE_PATH . "/src/View.php";
require_once PRIVATE_PATH . "/src/EventManager.php";
require_once PRIVATE_PATH . "/src/Utils.php";
require_once PRIVATE_PATH . "/src/ModuleLoader.php";
require_once PRIVATE_PATH . "/src/admin/AuthManager.php";

function launchApp()
{

    $authManager = new AuthManager();
    $requestUri = trim(parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH), '/');
    $pathParts = explode('/', $requestUri);
    $route = end($pathParts);
    $resetToken = $_GET['reset'] ?? null;

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

     $adminViewDefaults = [
        "favicon" => Utils::buildImageUrl($manifest["favicon"]),
        "logo_url" => Utils::buildImageUrl($manifest["logo"]),
        "main_stylesheet" => PUBLIC_URL . "/assets/css/{$manifest['skin']}/main.css",
        "module_stylesheet" => PUBLIC_URL . "/assets/css/admin/admin-core.css",
        "client_id" => CLIENT_ID, "dev_id" => DEV_BRANCH, "public_url" => PUBLIC_URL,
        "active_event_id" => null, "client_url" => CLIENT_URL, "navigable_modules" => [],
        "initial_context_json" => json_encode([]),
        "is_admin" => true,
        "show_login_modal" => false
    ];

    if ($resetToken) {
        $user = $authManager->validateResetToken($token);
        if ($user) {
            $content = View::render("admin/reset-password-form", ['token' => $resetToken]);
            $pageTitle = $manifest["titulo"] . " - Restablecer Contraseña";
        } else {
            $content = View::render("admin/invalid-token", ['message' => 'El enlace para restablecer la contraseña no es válido o ha expirado.']);
            $pageTitle = $manifest["titulo"] . " - Error";
        }
        
        echo View::render("layouts/main", array_merge($adminViewDefaults, [
            "page_title" => $pageTitle,
            "content" => $content
        ]));
        return;
    }

    if ($route === 'admin' && !$authManager->hasAdmins(CLIENT_ID)) {
        $content = View::render("admin/create-admin-form");
        
        echo View::render("layouts/main", array_merge($adminViewDefaults, [
            "page_title" => $manifest["titulo"] . " - Crear Administrador",
            "content" => $content,
        ]));
        return;
    }
    
    $isAdmin = $authManager->isLoggedIn();
    $showLoginModal = ($route === 'admin' && !$isAdmin);

    $pageTitle = $manifest["titulo"];
    $pageName = $manifest["nombre"];

    $eventManager = new EventManager($manifest["eventos"] ?? []);
    $activeEventContext = $eventManager->getContext();
    $activeEvent = $activeEventContext["active_event"];
    $activeEventId = $activeEvent['id'] ?? null;
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
    $moduleResult = $moduleLoader->loadById($activeModuleId, $isAdmin);

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
        "active_event_id" => $activeEventId,
        "client_url" => CLIENT_URL,
        "navigable_modules" => $navigableModules,
        "initial_context_json" => json_encode(
            $initialContextForJs,
            JSON_HEX_TAG | JSON_HEX_APOS | JSON_HEX_QUOT
        ),
        "is_admin" => $isAdmin,
        "show_login_modal" => $showLoginModal
    ]);
}