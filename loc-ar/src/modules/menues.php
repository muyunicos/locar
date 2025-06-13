<?php
/**
 * Lógica para el módulo de tipo 'menues'.
 * Obtiene los datos de un archivo JSON y los prepara para la vista.
 */

/**
 * Obtiene y procesa los datos para un módulo de menú.
 *
 * @param array $moduleConfig La configuración específica del módulo desde el manifest.
 * @param array $manifest El manifest completo del cliente.
 * @param array $context El contexto del evento activo.
 * @param string $clientId El ID del cliente.
 * @return array Los datos listos para ser renderizados por la plantilla.
 */
function get_module_data(array $moduleConfig, array $manifest, array $context, string $clientId): array
{
    // 1. Construir la ruta al archivo de datos usando la configuración del manifest.
    $dataPath = __DIR__ . '/../../../public_html/' . $clientId . '/datos/' . $moduleConfig['data_file']; //

    // 2. Verificar si el archivo de datos existe.
    if (!file_exists($dataPath)) {
        // Si no existe, devolver una estructura vacía con un mensaje de error.
        return [
            'menu_title' => $moduleConfig['title'],
            'categorias' => [],
            'footer_text' => '',
            'error' => 'Archivo de datos no encontrado: ' . htmlspecialchars($moduleConfig['data_file'])
        ];
    }

    // 3. Cargar y decodificar el archivo JSON.
    $data = json_decode(file_get_contents($dataPath), true);

    // Si el JSON es inválido, $data será null.
    if (json_last_error() !== JSON_ERROR_NONE) {
        return [
            'menu_title' => $moduleConfig['title'],
            'categorias' => [],
            'footer_text' => '',
            'error' => 'Error de sintaxis en el archivo JSON: ' . htmlspecialchars($moduleConfig['data_file'])
        ];
    }
    
    $categorias = $data['categorias'] ?? [];

    // 4. (Opcional) Aplicar modificaciones globales, como un descuento.
    // Esta lógica es un ejemplo y se puede adaptar. Actualmente no hay eventos que la activen.
    if (isset($context['module_modifications']['menu']['action']) && $context['module_modifications']['menu']['action'] === 'apply_discount') {
        $discount = $context['module_modifications']['menu']['value'];
        
        // Iteramos sobre las categorías y sus items para aplicar el descuento.
        // Se usa el operador de referencia (&) para modificar el array original.
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
                    // Si es un producto directo.
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

    // 5. Devolver el array final con los datos para la plantilla.
    // Usamos el operador de fusión de null (??) para evitar errores si las claves no existen en el JSON.
    return [
        'menu_title' => $data['titulo'] ?? $moduleConfig['title'], //
        'categorias' => $categorias, //
        'footer_text' => $data['footer'] ?? '' //
    ];
}