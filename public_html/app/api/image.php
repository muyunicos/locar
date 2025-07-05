<?php
// Silenciamos la salida de errores HTML por defecto para tener control total.
ini_set('display_errors', 0);
error_reporting(0);

// Declaramos el uso de la clase al principio del archivo. Esto es solo una declaración.
use Core\ImageManagerService;

// Establecemos la cabecera JSON lo antes posible.
header('Content-Type: application/json');

try {
    // La inclusión de archivos y la lógica de ejecución van DENTRO del try.
    require_once __DIR__ . '/api_bootstrap.php';

    // Ahora que el bootstrap se ha cargado, podemos usar las constantes y variables que define.
    $action = $input['action'] ?? null;
    $clientId = CLIENT_ID; 

    if (empty($clientId)) {
        throw new Exception('ID de cliente no especificado.', 400);
    }
    if (empty($action)) {
        throw new Exception('Acción no especificada.', 400);
    }

    // El resto de la lógica...
    if ($action === 'getTemplate') {
        header('Content-Type: text/html');
        $templatePath = PRIVATE_PATH . '/templates/modal/image-manager-modal.html';
        if (file_exists($templatePath)) {
            readfile($templatePath);
        } else {
            http_response_code(404); echo "Error: plantilla no encontrada.";
        }
        exit();
    }
    
    $service = new ImageManagerService($clientId);

    switch ($action) {
        case 'list':
            $images = $service->listImages();
            send_json_response(true, 'Imágenes obtenidas.', ['images' => $images]);
            break;

        case 'upload':
            if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
                throw new Exception('Método no permitido.', 405);
            }
            $watermarkFile = $_POST['watermark'] ?? null;
            $fileName = $service->saveAndApplyWatermark($_FILES['image'] ?? [], $watermarkFile);
            send_json_response(true, 'Imagen procesada.', ['fileName' => $fileName]);
            break;

        default:
            throw new Exception('Acción no válida.', 400);
    }

} catch (Throwable $e) {
    // Este bloque 'catch' es nuestra red de seguridad definitiva.
    if (!function_exists('send_json_response')) {
        // Fallback si ni siquiera el bootstrap se cargó.
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'message' => 'Error crítico en el arranque de la API.',
            'error_details' => $e->getMessage()
        ]);
    } else {
        // Si el bootstrap se cargó, usamos su función para una respuesta limpia.
        $statusCode = method_exists($e, 'getCode') && $e->getCode() >= 400 ? $e->getCode() : 500;
        send_json_response(false, $e->getMessage(), (defined('DEV') && DEV ? ["file" => $e->getFile(), "line" => $e->getLine()] : null), $statusCode);
    }
}