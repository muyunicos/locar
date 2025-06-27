<?php
namespace Core;

use Exception;

class ImageManagerService {
    private $clientId;
    private $imagesBaseDir;

    public function __construct(?string $clientId) {
        if (empty($clientId)) {
            throw new Exception('Se requiere el ID del cliente para el servicio de imágenes.');
        }
        $this->clientId = basename($clientId); 
        
        $this->imagesBaseDir = CLIENT_PATH . '/imagenes';
    }

    public function listImages(): array {
        $clientDir = $this->imagesBaseDir;
        if (!is_dir($clientDir)) {
            if (!mkdir($clientDir, 0775, true)) {
                 error_log("ImageManagerService: No se pudo crear el directorio: " . $clientDir);
                 return [];
            }
        }

        $files = scandir($clientDir);
        $images = [];

        foreach ($files as $file) {
            if (is_file($clientDir . '/' . $file)) {
                $ext = strtolower(pathinfo($file, PATHINFO_EXTENSION));
                if (in_array($ext, ['jpg', 'jpeg', 'png', 'gif', 'webp'])) {
                    $images[] = $file;
                }
            }
        }
        usort($images, function($a, $b) use ($clientDir) {
            return filemtime($clientDir . '/' . $b) <=> filemtime($clientDir . '/' . $a);
        });
        
        return $images;
    }

    public function uploadImage(array $file): string {
        if (empty($file) || $file['error'] !== UPLOAD_ERR_OK) {
            throw new Exception('Error en la subida o no se recibió el archivo.');
        }

        $allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        $maxSize = 5 * 1024 * 1024;

        if (!in_array($file['type'], $allowedTypes)) {
            throw new Exception('Tipo de archivo no permitido. Solo se aceptan: JPG, PNG, GIF, WebP.');
        }
        if ($file['size'] > $maxSize) {
            throw new Exception('El archivo es demasiado grande (máximo 5MB).');
        }

        $clientDir = $this->imagesBaseDir;
        if (!is_dir($clientDir) && !mkdir($clientDir, 0775, true)) {
            throw new Exception('Error crítico: No se pudo crear el directorio para las imágenes del cliente.');
        }

        $fileExtension = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
        $safeFileName = time() . '_' . bin2hex(random_bytes(2)) . '.' . $fileExtension;
        $destination = $clientDir . '/' . $safeFileName;

        if (move_uploaded_file($file['tmp_name'], $destination)) {
            return $safeFileName;
        } else {
            throw new Exception('No se pudo guardar el archivo en el servidor.');
        }
    }
}