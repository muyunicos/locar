<?php
function get_module_data(array $moduleConfig, array $manifest, array $context): array
{
    $itemsPath = __DIR__ . '/../../../public_html/' . basename(dirname(dirname($moduleConfig['data_file']))) . '/datos/' . basename($moduleConfig['data_file']);
    $items = json_decode(file_get_contents($itemsPath), true);

    // Comprobar si hay una modificación para este módulo
    if (isset($context['module_modifications']['catalog']['action']) && $context['module_modifications']['catalog']['action'] === 'apply_discount') {
        $discount = $context['module_modifications']['catalog']['value'];
        foreach ($items as &$item) {
            $originalPrice = (float)$item['price'];
            $newPrice = $originalPrice - ($originalPrice * $discount / 100);
            $item['original_price'] = $originalPrice; // Guardamos el precio original
            $item['price'] = round($newPrice);
            $item['name'] .= " (¡{$discount}% OFF!)";
        }
    }
    
    return [
        'catalog_title' => $moduleConfig['title'],
        'item_list' => $items
    ];
}