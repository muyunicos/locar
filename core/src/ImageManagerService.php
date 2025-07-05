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

    public function saveAndApplyWatermark(array $file, ?string $watermarkFile): string {
        // 1. Validar y guardar la imagen principal (lógica que ya tenías en uploadImage)
        if (empty($file) || $file['error'] !== UPLOAD_ERR_OK) {
            throw new Exception('Error en la subida del archivo principal.');
        }
        // ... (más validaciones de tamaño y tipo para $file) ...
        
        $clientDir = $this->imagesBaseDir;
        if (!is_dir($clientDir) && !mkdir($clientDir, 0775, true)) {
            throw new Exception('Error al crear el directorio del cliente.');
        }

        $safeFileName = time() . '_' . bin2hex(random_bytes(8)) . '.webp';
        $destinationPath = $clientDir . '/' . $safeFileName;

        // Mover el archivo subido a su destino final
        if (!move_uploaded_file($file['tmp_name'], $destinationPath)) {
            throw new Exception('No se pudo guardar la imagen principal.');
        }

        // 2. Si se proporcionó una marca de agua, la aplicamos.
        if (!empty($watermarkFile)) {
            $watermarkPath = $clientDir . '/' . basename($watermarkFile); // Seguridad con basename()

            if (!file_exists($watermarkPath)) {
                throw new Exception("El archivo de marca de agua no existe: $watermarkFile");
            }
            
            // Cargar ambas imágenes usando la librería GD
            $mainImage = imagecreatefromwebp($destinationPath);
            $watermarkImage = imagecreatefromwebp($watermarkPath);

            if (!$mainImage || !$watermarkImage) {
                throw new Exception('No se pudieron cargar las imágenes para aplicar la marca de agua.');
            }

           // Obtenemos las dimensiones de ambas imágenes
            $mainWidth = imagesx($mainImage);
            $mainHeight = imagesy($mainImage);
            $watermarkWidth = imagesx($watermarkImage);
            $watermarkHeight = imagesy($watermarkImage);

            // Usamos imagecopyresampled para estirar la marca de agua sobre toda la imagen principal.
            // Esta función copia un área rectangular de una imagen a otra, interpolando los valores de los píxeles
            // para que la calidad de la imagen sea alta incluso después de redimensionarla.
            imagecopyresampled(
                $mainImage,      // La imagen de destino
                $watermarkImage, // La imagen fuente (la marca de agua)
                0, 0,            // Coordenadas de destino (x, y) - esquina superior izquierda
                0, 0,            // Coordenadas de origen (x, y) - esquina superior izquierda
                $mainWidth,      // Ancho del destino (el ancho de la imagen principal)
                $mainHeight,     // Alto del destino (el alto de la imagen principal)
                $watermarkWidth, // Ancho original de la marca de agua
                $watermarkHeight // Alto original de la marca de agua
            );

            // Guardamos la imagen modificada, sobrescribiendo el original
            imagewebp($mainImage, $destinationPath, 90);

            // Liberamos memoria
            imagedestroy($mainImage);
            imagedestroy($watermarkImage);
        }

        return $safeFileName;
    }
}
