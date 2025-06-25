<?php
use Core\Utils;

function process_images_recursively(array &$items_array) {
    if (isset($items_array["imagen"]) && !empty($items_array["imagen"])) {
        $items_array["imagen_url"] = Utils::buildImageUrl($items_array["imagen"]);
    }

    if (isset($items_array["items"]) && is_array($items_array["items"])) {
        foreach ($items_array["items"] as &$subItem) {
            process_images_recursively($subItem);
        }
    }
}

function get_module_data(array $moduleConfig, array $context, bool $isAdmin = false,  bool $isAdminUrl = false): array
{
    $dataPath = CLIENT_PATH . "/datos/" . $moduleConfig["url"];

    if (!file_exists($dataPath)) {
        return [ "error" => "Archivo de datos no encontrado: " . htmlspecialchars($moduleConfig["url"]) ];
    }

    $jsonContent = file_get_contents($dataPath);
    $rawData = json_decode($jsonContent, true);

    if (json_last_error() !== JSON_ERROR_NONE) {
        return [ "error" => "Error de sintaxis en el archivo JSON: " . htmlspecialchars($moduleConfig["url"]) ];
    }
    
    $processedData = $rawData;
    process_images_recursively($processedData);
    
    if (!$isAdmin && isset($context["module_modifications"]["menu"]["action"]) && $context["module_modifications"]["menu"]["action"] === "apply_discount") {
        $discount = $context["module_modifications"]["menu"]["value"];
    }

    $viewData = [
        "menu_title" => $processedData["titulo"] ?? $moduleConfig["titulo"],
        "skin" => $processedData["skin"] ?? null,
        "main_skin" => $processedData["main_skin"] ?? null,
        "imagen_url" => $processedData["imagen_url"] ?? null,
        "sufijo" => $processedData["sufijo"] ?? null,
        "items" => $processedData["items"] ?? [],
        "footer_text" => $processedData["footer"] ?? "",
        "error" => $processedData["error"] ?? null
    ];
    
    if ($isAdmin && $isAdminUrl) {
        $viewData['raw_data_for_admin'] = $rawData;
    }
    
    return $viewData;
}