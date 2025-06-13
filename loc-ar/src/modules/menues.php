<?php

function process_images_recursively(array &$item)
{
    if (isset($item['imagen']) && !empty($item['imagen'])) {
        $item['imagen_url'] = Utils::buildImageUrl($item['imagen']);
    }

    if (isset($item['items']) && is_array($item['items'])) {
        foreach ($item['items'] as &$subItem) {
            process_images_recursively($subItem);
        }
    }

    if (isset($item['categorias']) && is_array($item['categorias'])) {
        foreach ($item['categorias'] as &$categoria) {
            process_images_recursively($categoria);
        }
    }
}

function get_module_data(array $moduleConfig, array $manifest, array $context): array
{
    $dataPath = __DIR__ . '/../../../public_html/' . CLIENT_ID . '/datos/' . $moduleConfig['data_file'];
    
    if (!file_exists($dataPath)) {
        return [
            'menu_title' => $moduleConfig['title'],
            'categorias' => [],
            'footer_text' => '',
            'error' => 'Archivo de datos no encontrado: ' . htmlspecialchars($moduleConfig['data_file'])
        ];
    }

    $data = json_decode(file_get_contents($dataPath), true);

    if (json_last_error() !== JSON_ERROR_NONE) {
        return [
            'menu_title' => $moduleConfig['title'],
            'categorias' => [],
            'footer_text' => '',
            'error' => 'Error de sintaxis en el archivo JSON: ' . htmlspecialchars($moduleConfig['data_file'])
        ];
    }

    process_images_recursively($data);
    
    $categorias = $data['categorias'] ?? [];

    if (isset($context['module_modifications']['menu']['action']) && $context['module_modifications']['menu']['action'] === 'apply_discount') {
        $discount = $context['module_modifications']['menu']['value'];
        foreach ($categorias as &$categoria) {
            foreach ($categoria['items'] as &$item) {
                // Si el item es una subcategoría, iteramos un nivel más.
                if (isset($item['es_subcategoria']) && $item['es_subcategoria']) { //
                    foreach ($item['items'] as &$producto) {
                        if (isset($producto['precio'])) {
                            $originalPrice = (float)$producto['precio'];
                            $newPrice = $originalPrice - ($originalPrice * $discount / 100);
                            $producto['original_price'] = $originalPrice;
                            $producto['precio'] = round($newPrice, 2);
                        }
                    }
                } else {
                    if (isset($item['precio'])) {
                        $originalPrice = (float)$item['precio'];
                        $newPrice = $originalPrice - ($originalPrice * $discount / 100);
                        $item['original_price'] = $originalPrice;
                        $item['precio'] = round($newPrice, 2);
                    }
                }
            }
        }
    }
   return [
        'menu_title' => $data['titulo'] ?? $moduleConfig['title'],
        'menu_image_url' => $data['imagen_url'] ?? null,
        'categorias' => $data['categorias'] ?? [],
        'footer_text' => $data['footer'] ?? '',
        'error' => $data['error'] ?? null
    ];
}