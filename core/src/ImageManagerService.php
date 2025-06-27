<?php

class ImageManagerService {
    private $clientId;
    private $baseDir;

    public function __construct($clientId) {
        if (!$clientId) {
            throw new Exception('Se requiere el ID del cliente.');
        }
        $this->clientId = basename($clientId);
        $this->baseDir = realpath(__DIR__ . '/../../public_html/imagenes');
    }

    public function listImages() {
        $clientDir = $this->baseDir . '/' . $this->clientId;

        if (!is_dir($clientDir)) {
            return [];
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
        return $images;
    }

    public function uploadImage($file) {
        // Validación del archivo
        if (!$file || $file['error'] !== UPLOAD_ERR_OK) {
            throw new Exception('Error en la subida del archivo.');
        }

        $allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        $maxSize = 5 * 1024 * 1024; // 5 MB

        if (!in_array($file['type'], $allowedTypes)) {
            throw new Exception('Tipo de archivo no permitido.');
        }
        if ($file['size'] > $maxSize) {
            throw new Exception('El archivo es demasiado grande (máx 5MB).');
        }

        // Almacenamiento
        $clientDir = $this->baseDir . '/' . $this->clientId;
        if (!is_dir($clientDir)) {
            if (!mkdir($clientDir, 0755, true)) {
                throw new Exception('No se pudo crear el directorio del cliente.');
            }
        }

        $fileExtension = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
        $safeFileName = time() . '_' . bin2hex(random_bytes(8)) . '.' . $fileExtension;
        $destination = $clientDir . '/' . $safeFileName;

        if (move_uploaded_file($file['tmp_name'], $destination)) {
            return $safeFileName;
        } else {
            throw new Exception('No se pudo mover el archivo subido.');
        }
    }
}