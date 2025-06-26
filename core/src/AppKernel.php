<?php
require_once __DIR__ . '/bootstrap.php';

define('CLIENT_URL', str_starts_with($_SERVER['HTTP_HOST'], CLIENT_ID . '.') ? "https://" . $_SERVER['HTTP_HOST'] : "https://" . $_SERVER['HTTP_HOST'] . '/' . CLIENT_ID );

$requestUri = trim(parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH), '/');
$pathParts = explode('/', $requestUri);
$route = end($pathParts);
define('IS_ADMIN_URL', $route === 'admin');

use Core\View;
use Core\Utils;
use Core\EventManager;
use Admin\AuthManager;
use Core\ModuleLoader;

function launchApp()
{
    $manifestPath = CLIENT_PATH . "/datos/manifest.json";
    log_dev_message("AppKernel: Buscando manifiesto en: " . $manifestPath);
    if (!file_exists($manifestPath)) {
        http_response_code(404);
        die("Error: Archivo de manifiesto no encontrado en " . $manifestPath . ".");
    }
    $manifestContent = file_get_contents($manifestPath);
    if ($manifestContent === false) {
        http_response_code(500);
        die("Error: No se pudo leer el contenido del manifiesto.");
    }
    $manifest = json_decode($manifestContent, true);
    if (json_last_error() !== JSON_ERROR_NONE) {
        http_response_code(500);
        die("Error: El manifiesto contiene un JSON inválido: " . json_last_error_msg());
    }
    log_dev_message("AppKernel: Manifiesto cargado exitosamente.");

    $isAdmin = false; 
    $pageTitle = $manifest["titulo"];
    $content = '';
    $moduleResult = null; 
    $activeEventId = null;
    $initialContextForJs = [
        "profile_title" => $manifest["titulo"],
        "default_skin" => $manifest["skin"],
        "default_favicon" => $manifest["favicon"],
    ];
    $navigableModules = [];
    $authManager = new AuthManager();

    if (IS_ADMIN_URL) {
        log_dev_message("AppKernel: Detectada URL de administrador.");

        if (!$authManager->hasAdmins()) {
            log_dev_message("AppKernel: No se encontraron administradores. Redirigiendo a formulario de creación.");
            $content = View::render("admin/create-admin-form");
            echo View::render("layouts/main", [
                "page_title" => $manifest["titulo"] . " - Crear Administrador",
                "favicon" => Utils::buildImageUrl($manifest["favicon"]),
                "logo_url" => Utils::buildImageUrl($manifest["logo"]),
                "main_stylesheets" => [
                    Utils::get_versioned_asset("/assets/css/{$manifest['skin']}/main.css"),
                    Utils::get_versioned_asset("/assets/css/admin/admin-core.css"),
                    Utils::get_versioned_asset("/assets/css/core.css")
                ],
                "module_stylesheets" => [],
                "main_scripts" => [
                    Utils::get_versioned_asset("/assets/js/admin/admin-core.js")
                ],
                "module_scripts" => [],
                "module_data " => [],
                "isAdmin" => false,
                "isAdminUrl" => false,
                "content" => $content,
                "spinner" => CLIENT_URL . "/imagenes/spinner.gif",
                "active_event_id" => null,
                "navigable_modules" => [],
                "initial_context_json" => json_encode($initialContextForJs, JSON_HEX_TAG | JSON_HEX_APOS | JSON_HEX_QUOT),
                "show_login_modal" => false
            ]);
            return;
        }


        $resetToken = $_GET['reset'] ?? null;
        if ($resetToken) {
            log_dev_message("AppKernel: Token de restablecimiento detectado.");
            $user = $authManager->validateResetToken($resetToken);
            if ($user) {
                $content = View::render("admin/reset-password-form", ['token' => $resetToken]);
                $pageTitle = $manifest["titulo"] . " - Restablecer Contraseña";
                log_dev_message("AppKernel: Token de restablecimiento válido.");
            } else {
                $content = View::render("admin/invalid-token", ['message' => 'El enlace para restablecer la contraseña no es válido o ha expirado.']);
                $pageTitle = $manifest["titulo"] . " - Error";
                log_dev_message("AppKernel: Token de restablecimiento inválido o expirado.");
            }
            echo View::render("layouts/main", [
                "page_title" => $pageTitle,
                "content" => $content,
                "favicon" => Utils::buildImageUrl($manifest["favicon"]),
                "logo_url" => Utils::buildImageUrl($manifest["logo"]),
                "main_stylesheets" => [
                    Utils::get_versioned_asset("/assets/css/{$manifest['skin']}/main.css"),
                    Utils::get_versioned_asset("/assets/css/admin/admin-core.css"),
                    Utils::get_versioned_asset("/assets/css/core.css")
                ],
                "module_stylesheets" => [],
                "main_scripts" => [
                    Utils::get_versioned_asset("/assets/js/admin/admin-core.js")
                ],
                "module_scripts" => [],
                "module_data " => [],
                "isAdmin" => false,
                "isAdminUrl" => false,
                "spinner" => CLIENT_URL . "/imagenes/spinner.gif",
                "active_event_id" => null,
                "navigable_modules" => [],
                "initial_context_json" => json_encode($initialContextForJs, JSON_HEX_TAG | JSON_HEX_APOS | JSON_HEX_QUOT),
                "show_login_modal" => false
            ]);
            return;
        }
    }

    $isAdmin = $authManager->isLoggedIn();
    log_dev_message("AppKernel: Admin isLoggedIn: " . ($isAdmin ? 'true' : 'false'));

    $showLoginModal = (IS_ADMIN_URL && !$isAdmin);
    log_dev_message("AppKernel: showLoginModal: " . ($showLoginModal ? 'true' : 'false') . " (IS_ADMIN_URL: " . (IS_ADMIN_URL ? 'true' : 'false') . ", !isAdmin: " . (!$isAdmin ? 'true' : 'false') . ")");

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

    $initial_module_id = null;
    $requested_module = $_SERVER['QUERY_STRING'] ?? '';
    foreach ($manifest["modulos"] as $moduleConfig) {
            if (strtolower((string) $moduleConfig["id"]) == strtolower($requested_module)) {
                $initial_module_id = $moduleConfig["id"];
            break;
        }
    }

    $moduleLoader = new ModuleLoader($manifest, $activeEventContext);

    $activeModuleId = $initial_module_id ?? $activeEvent["cambios"]["modulo"] ?? $manifest["modulo"];

    $moduleResult = $moduleLoader->loadById($activeModuleId, $isAdmin, IS_ADMIN_URL);
    
    if (isset($activeEvent["cambios"]["sufijo"])) {
        $pageTitle .= $activeEvent["cambios"]["sufijo"];
    } else {
        $pageTitle .= $moduleResult['sufijo'];
    }
    $content = $moduleResult['html'];

    $mainStylesheets = [];
    if ($moduleResult['main_skin_override'] && empty($activeEvent["cambios"]["skin"])) {
        $mainStylesheets[] = $moduleResult['main_skin_override'];
    } else {
        $mainStylesheets[] = Utils::get_versioned_asset("/assets/css/{$mainSkin}/main.css");
    }
    
    

    
    $cssFiles = Utils::getFilesInDirectory(PUBLIC_PATH . "/assets/css", 'css');
    foreach ($cssFiles as $cssFile) {
        if (strpos($cssFile, 'main.css') !== false || strpos($cssFile, 'admin-core.css') !== false) {
            continue;
        }
        $mainStylesheets[] = Utils::get_versioned_asset("/assets/css/" . $cssFile);
    }

    if (IS_ADMIN_URL) {
        $mainStylesheets[] = Utils::get_versioned_asset("/assets/css/admin/admin-core.css");
    }


    $mainScripts = [];

    $jsFiles = Utils::getFilesInDirectory(PUBLIC_PATH . "/assets/js", 'js');
    foreach ($jsFiles as $jsFile) {
        if (strpos($jsFile, 'admin-core.js') !== false) {
            continue;
        }
        $mainScripts[] = Utils::get_versioned_asset("/assets/js/" . $jsFile);
    }
    
    if (IS_ADMIN_URL) {
        $mainScripts[] = Utils::get_versioned_asset("/assets/js/admin/admin-core.js");
    }
    $initialContextForJs = array_merge($initialContextForJs, [
        "active_event" => $activeEvent,
    ]);

    echo View::render("layouts/main", [
        "page_title" => $pageTitle,
        "favicon" => $favicon,
        "logo_url" => $logoUrl,
        "main_stylesheets" => $mainStylesheets,
        "module_stylesheets" => $moduleResult['css'],
        "main_scripts" => $mainScripts,
        "module_scripts" => $moduleResult['js'],
        "isAdmin" => $isAdmin,
        "isAdminUrl" => IS_ADMIN_URL,
        "content" => $content,
        "spinner" => CLIENT_URL . "/imagenes/spinner.gif",
        "active_event_id" => $activeEventId,
        "navigable_modules" => $navigableModules,
        "initial_context_json" => json_encode(
            $initialContextForJs,
            JSON_HEX_TAG | JSON_HEX_APOS | JSON_HEX_QUOT
        ),
        "show_login_modal" => $showLoginModal
    ]);
}