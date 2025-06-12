<?php
function get_module_data(array $moduleConfig, array $manifest, array $context, string $clientId): array
{
    $moduleID = '';
    if (isset($moduleConfig['id'])) {
        $moduleID = '_' . $moduleConfig['id'];
    }
    $itemsPath = __DIR__ . '/../../../public_html/' . $clientId . '/datos/menues' . $moduleID . '_items.json';
    
    $data = json_decode(file_get_contents($itemsPath), true);

    // Verificamos si los items están en una clave 'items' o si el archivo es el array directamente
    $items = isset($data['items']) && is_array($data['items']) ? $data['items'] : $data;

    // La lógica de descuento que sigue es correcta, no necesita cambios.
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