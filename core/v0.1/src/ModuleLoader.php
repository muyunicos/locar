<?php
namespace Core;
use Core\View;

class ModuleLoader {
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
                "css" => [],
                "js" => [],
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
                "css" => [],
                "js" => [],
                "skin" => $this->manifest["skin"],
                "main_skin_override" => false,
                "error" => true
            ];
        }
        
        require_once $logicPath;

        $moduleData = get_module_data($moduleConfig, $this->activeEventContext, $isAdmin);
        
        $viewData = $moduleData;
        $viewData['is_admin'] = $isAdmin;
        $viewData['dataSourceFile'] = $moduleConfig['url']; 

        // Esta es la corrección clave que hicimos. Se asegura de que el editor
        // JavaScript reciba los datos crudos y limpios del JSON.
        $viewData['json_for_admin'] = $moduleData['raw_data_for_admin'] ?? [];

        $htmlContent = View::render("modules/" . $moduleType, $viewData);

        // --- INICIO: Lógica para cargar assets (esencial y conservada) ---
        $activeEvent = $this->activeEventContext["active_event"];
        $globalSkin = $activeEvent["cambios"]["skin"] ?? $this->manifest["skin"];
        $moduleSkin = $moduleData["skin"] ?? $globalSkin;
        $cssUrls = [];
        $jsUrls = [];

        // Cargar CSS del módulo (ej. /assets/css/revelbar/menues.css)
        $moduleCssPath = "/assets/css/{$moduleSkin}/{$moduleType}.css";
        if (file_exists(PUBLIC_PATH . $moduleCssPath)) {
            $cssUrls[] = PUBLIC_URL . $moduleCssPath;
        }

        // Cargar JS del módulo (ej. /assets/js/modules/menues.js)
        $moduleJsPath = "/assets/js/modules/{$moduleType}.js";
        if (file_exists(PUBLIC_PATH . $moduleJsPath)) {
            $jsUrls[] = PUBLIC_URL . $moduleJsPath;
        }

        // Si es admin, cargar también los archivos de administración
        if ($isAdmin) {
            // Cargar CSS de admin (ej. /assets/css/admin/admin-menues.css)
            $adminCssPath = "/assets/css/admin/admin-{$moduleType}.css";
            if (file_exists(PUBLIC_PATH . $adminCssPath)) {
                $cssUrls[]  = PUBLIC_URL . $adminCssPath;
            }
            // Cargar JS de admin (ej. /assets/js/admin/admin-menues.js)
            $adminJsPath = "/assets/js/admin/admin-{$moduleType}.js";
            if (file_exists(PUBLIC_PATH . $adminJsPath)) {
                $jsUrls[]  = PUBLIC_URL . $adminJsPath;
            }
        }
        // --- FIN: Lógica para cargar assets ---

        return [
            "html" => $htmlContent,
            "css" => $cssUrls,
            "js" => $jsUrls,
            "skin" => $moduleSkin,
            "sufijo" => $moduleData["sufijo"] ?? null,
            "main_skin_override" => $moduleData["main_skin"] ?? false,
            "type" => $moduleType,
            "error" => $moduleData['error'] ?? false
        ];
    }
}