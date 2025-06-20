<?php
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
        return BASE_URL . CLIENT_ID . '/imagenes/' . $imageName;
    }
}