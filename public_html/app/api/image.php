<?php
require_once __DIR__ . '/api_bootstrap.php';

use Core\ImageManagerService;

$action = $input['action'] ?? null;
$clientId = CLIENT_ID; 

if (empty($action)) {
    send_json_response(false, 'Acción no especificada.', null, 400);
}
if (empty($clientId)) {
    send_json_response(false, 'ID de cliente no especificado.', null, 400);
}

try {
    if ($action === 'getTemplate') {
        header('Content-Type: text/html');
        $templatePath = PRIVATE_PATH . '/templates/modal/image-manager-modal.html';
        if (!file_exists($templatePath)) {
            http_response_code(404);
            echo "Error: no se encontró la plantilla del modal.";
        } else {
            readfile($templatePath);
        }
        exit();
    }

    $service = new ImageManagerService($clientId);

    switch ($action) {
        case 'list':
            $images = $service->listImages();
            send_json_response(true, 'Imágenes obtenidas correctamente.', ['images' => $images]);
            break;

        case 'upload':
            if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
                send_json_response(false, 'Método no permitido. Use POST para subir archivos.', null, 405);
            }
            $fileName = $service->uploadImage($_FILES['image'] ?? []);
            send_json_response(true, 'Imagen subida con éxito.', ['fileName' => $fileName]);
            break;

        default:
            send_json_response(false, 'La acción solicitada no es válida.', null, 400);
            break;
    }

} catch (Exception $e) {
    error_log("Error en image.php: " . $e->getMessage());
    send_json_response(
        false, 
        $e->getMessage(), 
        (defined('DEV') && DEV ? ["file" => $e->getFile(), "line" => $e->getLine()] : null), 
        500
    );
}