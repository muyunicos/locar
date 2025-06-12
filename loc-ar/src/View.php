<?php
// loc-ar/src/View.php
class View {
    public static function render(string $templateName, array $data = []): string
    {
        // extrae el array asociativo a variables (ej: $data['title'] se convierte en $title)
        extract($data);
        
        // Inicia el buffer de salida. PHP "guardará" todo lo que se imprima.
        ob_start();
        
        // Incluye el archivo de la plantilla. Usamos .html como solicitaste.
        include __DIR__ . '/../templates/' . $templateName . '.html'; // <-- CAMBIO AQUÍ
        
        // Obtiene el contenido del buffer, lo limpia y lo devuelve como string.
        return ob_get_clean();
    }
}