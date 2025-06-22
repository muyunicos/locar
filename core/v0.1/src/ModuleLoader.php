<?php

class ModuleLoader
{
    private array $manifest;
    private array $activeEventContext;

    public function __construct(array $manifest, array $activeEventContext)
    {
        $this->manifest = $manifest;
        $this->activeEventContext = $activeEventContext;
    }

    public function loadById(string $moduleId, bool $isAdmin = false): array
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
                "css_url" => null,
                "admin_js_url" => null,
                "skin" => $this->manifest["skin"],
                "main_skin_override" => false,
                "error" => true
            ];
        }

        $moduleType = $moduleConfig["tipo"];
        $logicPath = PRIVATE_PATH . "/src/modules/" . $moduleType . ".php";

        if (!file_exists($logicPath)) {
            return [
                "html" => "<div class='app-error'>Error: No se encontró la lógica para el módulo de tipo '{$moduleType}'.</div>",
                "css_url" => null,
                "admin_js_url" => null,
                "skin" => $this->manifest["skin"],
                "main_skin_override" => false,
                "error" => true
            ];
        }
        
        require_once $logicPath;

        $moduleData = get_module_data($moduleConfig, $this->activeEventContext);
        $viewData = $moduleData;
        $viewData['module_data'] = $moduleData; 
        $viewData['is_admin'] = $isAdmin;
        $viewData['dataSourceFile'] = $moduleConfig['url']; 

        $moduleData['is_admin'] = $isAdmin;
        
        $activeEvent = $this->activeEventContext["active_event"];
        $globalSkin = $activeEvent["cambios"]["skin"] ?? $this->manifest["skin"];
        $moduleSkin = $moduleData["skin"] ?? $globalSkin;
        
        $cssUrl = null;
        $moduleCssPath = "/assets/css/{$moduleSkin}/{$moduleType}.css";
        if (file_exists(PUBLIC_PATH . $moduleCssPath)) {
            $cssUrl = PUBLIC_URL . $moduleCssPath;
        }
        $adminJsUrl = null;

        if ($isAdmin) {
            $adminJsPath = "/assets/js/admin/admin-{$moduleType}.js";
            if (file_exists(PUBLIC_PATH . $adminJsPath)) {
                $adminJsUrl = PUBLIC_URL . $adminJsPath;
            }
        }

        $htmlContent = View::render("modules/" . $moduleType, $viewData);

        return [
            "html" => $htmlContent,
            "css_url" => $cssUrl,
            "admin_js_url" => $adminJsUrl,
            "skin" => $moduleSkin,
            "sufijo" => $moduleData["sufijo"] ?? null,
            "main_skin_override" => $moduleData["main_skin"] ?? false,
            "module_type" => $moduleType,
            "error" => false
        ];
    }
}