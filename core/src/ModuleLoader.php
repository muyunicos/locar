<?php
namespace Core;
use Core\Utils;
use Core\View; 

class ModuleLoader {
    private array $manifest;
    private array $activeEventContext;

    public function __construct(array $manifest, array $activeEventContext)
    {
        $this->manifest = $manifest;
        $this->activeEventContext = $activeEventContext;
    }

    public function loadById(string $moduleId, bool $isAdmin = false, bool $isAdminUrl = false): array
    {
        $moduleConfig = null;
        foreach ($this->manifest["modulos"] as $module) {
            if ((string) $module["id"] === $moduleId) {
                $moduleConfig = $module;
                break;
            }
        }

        if (!$moduleConfig) {
            return [
                "html" => "<div class='app-error'>Error: El módulo con ID '{$moduleId}' no fue encontrado.</div>",
                "css" => [], "js" => [], "error" => true,
                "skin" => $this->manifest["skin"], "main_skin_override" => false
            ];
        }

        $moduleType = $moduleConfig["tipo"];
        $logicPath = PRIVATE_PATH . "/src/modules/" . $moduleType . ".php";

        if (!file_exists($logicPath)) {
            return [
                "html" => "<div class='app-error'>Error: No se encontró la lógica para el módulo de tipo '{$moduleType}'.</div>",
                "css" => [], "js" => [], "error" => true,
                "skin" => $this->manifest["skin"], "main_skin_override" => false
            ];
        }
        
        require_once $logicPath;

        $moduleData = get_module_data($moduleConfig, $this->activeEventContext, $isAdmin, $isAdminUrl);
        
        $viewData = $moduleData;
        $viewData['isAdmin'] = $isAdmin;
        $viewData['isAdminUrl'] = $isAdminUrl;
        $viewData['dataSourceFile'] = $moduleConfig['url']; 
        $viewData['json_for_admin'] = $moduleData['raw_data_for_admin'] ?? [];

        $htmlContent = View::render("modules/" . $moduleType, $viewData);
        $activeEvent = $this->activeEventContext["active_event"];
        $globalSkin = $activeEvent["cambios"]["skin"] ?? $this->manifest["skin"];
        $moduleSkin = $moduleData["skin"] ?? $globalSkin;
        $cssUrls = [];
        $jsUrls = [];
        $mainCssUrlOverride = null;

        if ($moduleData["main_skin"] ?? false) {
            $mainCssUrlOverride = Utils::get_versioned_asset("/assets/css/" . $moduleSkin . "/main.css");
        }

        $moduleCssPath = "/assets/css/{$moduleSkin}/{$moduleType}.css";
        if (file_exists(PUBLIC_PATH . $moduleCssPath)) {
            $cssUrls[] = Utils::get_versioned_asset($moduleCssPath);
        }

        $moduleJsPath = "/assets/js/modules/{$moduleType}.js";
        if (file_exists(PUBLIC_PATH . $moduleJsPath)) {
            $jsUrls[] = Utils::get_versioned_asset($moduleJsPath);
        }

        if ($isAdmin && $isAdminUrl) {
            $adminCssPath = "/assets/css/admin/admin-{$moduleType}.css";
            if (file_exists(PUBLIC_PATH . $adminCssPath)) {
                $cssUrls[]  = Utils::get_versioned_asset($adminCssPath);
            }
            
            $adminJsPath = "/assets/js/admin/admin-{$moduleType}.js";
            if (file_exists(PUBLIC_PATH . $adminJsPath)) {
                $jsUrls[]  = Utils::get_versioned_asset($adminJsPath);
            }
        }

        return [
            "html" => $htmlContent,
            "css" => $cssUrls,
            "js" => $jsUrls,
            "skin" => $moduleSkin,
            "sufijo" => $moduleData["sufijo"] ?? null,
            "main_skin_override" => $mainCssUrlOverride,
            "type" => $moduleType,
            "error" => $moduleData['error'] ?? false
        ];
    }
}