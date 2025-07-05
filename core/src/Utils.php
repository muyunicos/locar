<?php
namespace Core;
class Utils
{
    public static function buildImageUrl(?string $imageName): ?string
    {
        if (empty($imageName)) {
            return null;
        }
        if (strpos($imageName, '.') === false) {
            $imageName .= '.webp';
        }
        return CLIENT_URL . '/imagenes/' . $imageName;
    }

 public static function getFilesInDirectory(string $directoryPath, ?string $extension = null): array
    {
        $files = [];
        $items = @scandir($directoryPath);

        if ($items === false) {
            if (function_exists('log_dev_message')) {
                log_dev_message("Advertencia: El directorio no existe o no se puede leer: " . $directoryPath);
            } else if (defined('DEV') && DEV) {
                error_log("Advertencia (Utils): El directorio no existe o no se puede leer: " . $directoryPath);
            }
            return [];
        }

        foreach ($items as $item) {
            if ($item === '.' || $item === '..') {
                continue;
            }

            $item_path = $directoryPath . DIRECTORY_SEPARATOR . $item;

            if (is_file($item_path)) {
                if ($extension === null || pathinfo($item, PATHINFO_EXTENSION) === $extension) {
                    $files[] = $item;
                }
            }
        }
        return $files;
    }

   public static function get_versioned_asset(string $path): string
{
    // Obtiene la extensión del archivo para decidir qué hacer
    $extension = pathinfo($path, PATHINFO_EXTENSION);

    // Si es un archivo JavaScript, usa el asset-loader
    if ($extension === 'js') {
        // Extrae la ruta del archivo sin el prefijo '/assets/js/'
        $file_param = str_replace('/assets/js/', '', $path);
        
        // Define la URL base del cargador de assets
        $loader_url = PUBLIC_URL . '/api/asset-loader.php';
        
        // Genera la versión (nota que empieza con '&')
        $version_param = '';
        if (DEV) {
            $full_server_path = PUBLIC_PATH . $path;
            if (file_exists($full_server_path)) {
                $version_param = '&v=' . filemtime($full_server_path);
            }
        } else {
            $version_param = '&v=' . VERSION;
        }
        
        // Devuelve la URL apuntando al loader
        return $loader_url . '?file=' . $file_param . $version_param;
    } 
    // Para cualquier otro tipo de archivo (css, jpg, etc.)
    else {
        // Genera la versión (nota que empieza con '?')
        $version_param = '';
        if (DEV) {
            $full_server_path = PUBLIC_PATH . $path;
            if (file_exists($full_server_path)) {
                $version_param = '?v=' . filemtime($full_server_path);
            }
        } else {
            $version_param = '?v=' . VERSION;
        }
        
        // Devuelve la URL directa al archivo, como antes
        return PUBLIC_URL . $path . $version_param;
    }
}
}   
