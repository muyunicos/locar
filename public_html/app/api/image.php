<?php
require_once __DIR__ . '/../../core/src/ImageManagerService.php';

header('Content-Type: application/json');

$action = $_GET['action'] ?? null;

try {
    switch ($action) {
        case 'getTemplate':
            header('Content-Type: text/html');
            readfile(__DIR__ . '/../../core/templates/image-manager-modal.html');
            break;

        case 'list':
            $clientId = $_GET['clientId'] ?? null;
            $service = new ImageManagerService($clientId);
            echo json_encode($service->listImages());
            break;

        case 'upload':
            if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
                throw new Exception('Método no permitido.');
            }
            $clientId = $_POST['clientId'] ?? null;
            $service = new ImageManagerService($clientId);
            $fileName = $service->uploadImage($_FILES['image'] ?? null);
            echo json_encode(['success' => true, 'fileName' => $fileName]);
            break;

        default:
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'Acción no válida.']);
            break;
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}