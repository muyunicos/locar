<?php
function get_module_data(array $moduleConfig, array $manifest, array $context, string $clientId): array
{
    $moduleID = '';
    if (isset($moduleConfig['id'])) {
        $moduleID = '_' . $moduleConfig['id'];
    }
    $itemsPath = __DIR__ . '/../../../public_html/' . $clientId . '/datos/menues' . $moduleID . '_items.json';
    
    $items = json_decode(file_get_contents($itemsPath), true);

    if (isset($context['module_modifications']['catalog']['action']) && $context['module_modifications']['catalog']['action'] === 'apply_discount') {
        $discount = $context['module_modifications']['catalog']['value'];
        foreach ($items as &$item) {
            $originalPrice = (float)$item['price'];
            $newPrice = $originalPrice - ($originalPrice * $discount / 100);
            $item['original_price'] = $originalPrice;
            $item['price'] = round($newPrice);
            $item['name'] .= " (¡{$discount}% OFF!)";
        }
    }
    
    return [
        'catalog_title' => $moduleConfig['title'],
        'item_list' => $items
    ];
}