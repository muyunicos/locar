<?php
if (basename($_SERVER['PHP_SELF']) === basename(__FILE__)) {
    header('Location: /');
    exit;
}

function process_images_recursively(array &$item)
{
    if (isset($item["imagen"]) && !empty($item["imagen"])) {
        $item["imagen_url"] = Utils::buildImageUrl($item["imagen"]);
    }
    if (isset($item["items"]) && is_array($item["items"])) {
        foreach ($item["items"] as &$subItem) {
            process_images_recursively($subItem);
        }
    }
}

function get_module_data(array $moduleConfig, array $context, bool $isAdmin = false): array
{
    $dataPath = CLIENT_PATH . "/datos/" . $moduleConfig["url"];

    if (!file_exists($dataPath)) {
        return [
            "menu_title" => $moduleConfig["titulo"], "items" => [], "footer_text" => "",
            "error" => "Archivo de datos no encontrado: " . htmlspecialchars($moduleConfig["url"]),
        ];
    }

    $data = json_decode(file_get_contents($dataPath), true);

    if (json_last_error() !== JSON_ERROR_NONE) {
        return [
            "menu_title" => $moduleConfig["titulo"], "items" => [], "footer_text" => "",
            "error" => "Error de sintaxis en el archivo JSON: " . htmlspecialchars($moduleConfig["url"]),
        ];
    }
    
    if (!$isAdmin) {
        process_images_recursively($data);
    }
    
    $items = $data["items"] ?? [];

    if (
        isset($context["module_modifications"]["menu"]["action"]) &&
        $context["module_modifications"]["menu"]["action"] === "apply_discount"
    ) {
        $discount = $context["module_modifications"]["menu"]["value"];
        foreach ($items as &$categoria) {
            foreach ($categoria["items"] as &$item) {
                if (isset($item["es_cat"]) && $item["es_cat"]) {
                    foreach ($item["items"] as &$producto) {
                        if (isset($producto["precio"])) {
                            $originalPrice = (float) $producto["precio"];
                            $newPrice = $originalPrice - ($originalPrice * $discount) / 100;
                            $producto["original_price"] = $originalPrice;
                            $producto["precio"] = round($newPrice, 2);
                        }
                    }
                } else {
                    if (isset($item["precio"])) {
                        $originalPrice = (float) $item["precio"];
                        $newPrice = $originalPrice - ($originalPrice * $discount) / 100;
                        $item["original_price"] = $originalPrice;
                        $item["precio"] = round($newPrice, 2);
                    }
                }
            }
        }
    }

    return [
        "menu_title" => $data["titulo"] ?? $moduleConfig["titulo"],
        "skin" => $data["skin"] ?? null,
        "main_skin" => $data["main_skin"] ?? null,
        "imagen" => Utils::buildImageUrl($data["imagen"] ?? null),
        "sufijo" => $data["sufijo"] ?? null,
        "items" => $items,
        "footer_text" => $data["footer"] ?? "",
        "error" => $data["error"] ?? null
    ];
}