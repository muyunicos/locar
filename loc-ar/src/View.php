<?php
class View {
    public static function render(string $templateName, array $data = []): string
    {
        extract($data);
        ob_start();
        include __DIR__ . '/../templates/' . $templateName . '.html';
        return ob_get_clean();
    }
}