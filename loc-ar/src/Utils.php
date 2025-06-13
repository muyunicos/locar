<?php
// loc-ar/src/Utils.php

/**
 * Contiene un conjunto de funciones de utilidad estáticas para la aplicación.
 */
class Utils
{
    /**
     * Construye la URL completa para una imagen específica del cliente.
     *
     * - Añade la extensión .webp por defecto si no se proporciona una.
     * - Asume que las imágenes residen en la carpeta /imagenes/ del cliente.
     *
     * @param string $imageName El nombre base del archivo (ej: "logo" o "logo.svg").
     * @param string $clientId El ID del cliente (ej: "test").
     * @param string $baseUrl La URL base de la aplicación.
     * @return string|null La URL completa de la imagen o null si el nombre está vacío.
     */
    public static function buildImageUrl(string $imageName, string $clientId, string $baseUrl): ?string
    {
        if (empty($imageName)) {
            return null;
        }

        // Si el nombre del archivo no contiene un '.', le añadimos la extensión .webp por defecto.
        if (strpos($imageName, '.') === false) {
            $imageName .= '.webp';
        }

        // Construimos la URL: {baseUrl}/{clientId}/imagenes/{nombreDeImagen}
        return rtrim($baseUrl, '/') . '/' . $clientId . '/imagenes/' . $imageName;
    }

    // En el futuro, podrías añadir más funciones útiles aquí.
    // public static function formatPrice(...) {}
}