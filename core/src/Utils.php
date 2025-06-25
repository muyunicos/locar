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
}   
