<?php
namespace Core;
class View {
    public static function render(string $templateName, array $data = []): string
    {
        extract($data);
        ob_start();
        include PRIVATE_PATH . '/templates/' . $templateName . '.html';
        return ob_get_clean();
    }
}