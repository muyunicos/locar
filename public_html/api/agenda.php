<?php
header("Access-Control-Allow-Origin: https://test.loc.ar");
header('Content-Type: application/json');

// Incluimos la clase que modificamos en el paso anterior
require_once __DIR__ . '/../../loc-ar/src/EventManager.php';

// 1. Obtener y validar el clientId (misma lógica de seguridad que antes)
$clientId = $_GET['client'] ?? '';

if (!preg_match('/^[a-zA-Z0-9_-]+$/', $clientId)) {
    http_response_code(400); // Bad Request
    echo json_encode(['error' => 'ID de cliente inválido.']);
    exit;
}

// 2. Construir la ruta al manifiesto y comprobar que exista
$manifestPath = __DIR__ . '/../' . $clientId . '/datos/manifest.json';

if (!file_exists($manifestPath)) {
    http_response_code(404); // Not Found
    echo json_encode(['error' => 'Manifiesto no encontrado para el cliente.']);
    exit;
}

// 3. Cargar el manifiesto
$manifest = json_decode(file_get_contents($manifestPath), true);
if (json_last_error() !== JSON_ERROR_NONE) {
    http_response_code(500); // Internal Server Error
    echo json_encode(['error' => 'Error al leer el manifiesto.']);
    exit;
}

try {
    // 4. Usar nuestro EventManager para obtener la agenda
    $eventManager = new EventManager($manifest['timed_events']);

    // Definimos la ventana de tiempo: desde ahora hasta dentro de 6 horas
    $timezone = new DateTimeZone('America/Argentina/Buenos_Aires');
    $now = new DateTime('now', $timezone);
    $until = (clone $now)->add(new DateInterval('PT6H')); // PT6H = Period of Time 6 Hours

    // ¡Aquí usamos el nuevo método que creamos!
    $agenda = $eventManager->getEventsAgenda($until);

    // 5. Devolvemos la agenda y también la fecha actual del servidor
    // Enviar la hora del servidor es crucial para que el cliente pueda calcular
    // el tiempo restante para los eventos sin depender de su propio reloj.
    echo json_encode([
        'server_time_iso' => $now->format(DateTime::ISO8601),
        'events_agenda' => $agenda
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Ocurrió un error en el servidor.', 'details' => $e->getMessage()]);
}