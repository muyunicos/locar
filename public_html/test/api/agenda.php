<?php
$allowed_domains = [
    'loc.ar'
];
$origin = $_SERVER['HTTP_ORIGIN'] ?? null;
$origin_host = null;
$is_allowed = false;

if ($origin) {

    $origin_host = parse_url($origin, PHP_URL_HOST);
    foreach ($allowed_domains as $domain) {
        if ($origin_host === $domain || str_ends_with($origin_host, '.' . $domain)) {
            $is_allowed = true;
            break;
        }
    }
}

if ($is_allowed) {
    header("Access-Control-Allow-Origin: " . $origin);
    //header("Access-Control-Allow-Credentials: true");
    //header("Access-Control-Max-Age: 86400"); 
}

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    if ($is_allowed) {
        //header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
        //header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
    }
    exit(0);
}

header('Content-Type: application/json');

require_once __DIR__ . '../../../test/src/EventManager.php';

$clientId = $_GET['client'] ?? '';

if (!preg_match('/^[a-zA-Z0-9_-]+$/', $clientId)) {
    http_response_code(400);
    echo json_encode(['error' => 'ID de cliente inválido.']);
    exit;
}

$manifestPath = __DIR__ . '/../../' . $clientId . '/datos/manifest.json';

if (!file_exists($manifestPath)) {
    http_response_code(404); // Not Found
    echo json_encode(['error' => 'Manifiesto no encontrado para el cliente.']);
    exit;
}

$manifest = json_decode(file_get_contents($manifestPath), true);
if (json_last_error() !== JSON_ERROR_NONE) {
    http_response_code(500); // Internal Server Error
    echo json_encode(['error' => 'Error al leer el manifiesto.']);
    exit;
}

try {
    // FIX: Use 'eventos' key instead of 'timed_events'
    $eventManager = new EventManager($manifest['eventos'] ?? []);

    $timezone = new DateTimeZone('America/Argentina/Buenos_Aires');
    $now = new DateTime('now', $timezone);
    $until = (clone $now)->add(new DateInterval('PT6H'));

    $agenda = $eventManager->getEventsAgenda($until);

    echo json_encode([
        'server_time_iso' => $now->format(DateTime::ISO8601),
        'events_agenda' => $agenda
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Ocurrió un error en el servidor.', 'details' => $e->getMessage()]);
}