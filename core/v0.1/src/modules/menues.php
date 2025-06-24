<?php
use Core\Utils;

/**
 * Procesa recursivamente un array de ítems para construir las URL completas de las imágenes.
 */
function process_images_recursively(array &$items_array)
{
    // Si el elemento raíz tiene una imagen (ej. logo del menú)
    if (isset($items_array["imagen"]) && !empty($items_array["imagen"])) {
        $items_array["imagen_url"] = Utils::buildImageUrl($items_array["imagen"]);
    }

    // Si hay una lista de ítems, la recorre
    if (isset($items_array["items"]) && is_array($items_array["items"])) {
        foreach ($items_array["items"] as &$subItem) {
            // Llamada recursiva para cada sub-ítem
            process_images_recursively($subItem);
        }
    }
}

/**
 * Obtiene y prepara los datos para el módulo de menú.
 */
function get_module_data(array $moduleConfig, array $context, bool $isAdmin = false): array
{
    $dataPath = CLIENT_PATH . "/datos/" . $moduleConfig["url"];

    if (!file_exists($dataPath)) {
        return [ "error" => "Archivo de datos no encontrado: " . htmlspecialchars($moduleConfig["url"]) ];
    }

    // 1. Leemos el contenido JSON y lo guardamos en $rawData. Esta es la versión original.
    $jsonContent = file_get_contents($dataPath);
    $rawData = json_decode($jsonContent, true);

    if (json_last_error() !== JSON_ERROR_NONE) {
        return [ "error" => "Error de sintaxis en el archivo JSON: " . htmlspecialchars($moduleConfig["url"]) ];
    }
    
    // 2. Creamos una copia para procesar, manteniendo la original ($rawData) intacta.
    $processedData = $rawData;
    process_images_recursively($processedData);
    
    // 3. (Opcional) Aplicamos modificaciones solo para la vista pública.
    if (!$isAdmin && isset($context["module_modifications"]["menu"]["action"]) && $context["module_modifications"]["menu"]["action"] === "apply_discount") {
        $discount = $context["module_modifications"]["menu"]["value"];
        // (Aquí iría la lógica para aplicar descuentos a $processedData)
    }

    // 4. Construimos el array de datos para la vista usando la data procesada.
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
    
    // 5. Si es admin, añadimos la data original ($rawData) para que el editor la utilice.
    if ($isAdmin) {
        $viewData['raw_data_for_admin'] = $rawData;
    }
    
    // 6. (CORRECCIÓN CLAVE) Devolvemos el array de datos completo.
    return $viewData;
}