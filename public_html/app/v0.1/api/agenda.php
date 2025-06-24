<?php
require_once __DIR__ . '/api_bootstrap.php';
use Core\EventManager;
use Core\Utils;

if (!preg_match('/^[a-zA-Z0-9_-]+$/', CLIENT_ID)) {
    send_json_response(false, "ID de cliente inválido.", null, 400);
}

$manifestPath = CLIENT_PATH . "/datos/manifest.json";
log_dev_message("Agenda API: Buscando manifiesto en: " . $manifestPath);

if (!file_exists($manifestPath)) {
    send_json_response(false, "Manifiesto no encontrado para el cliente.", null, 404);
}

$manifestContent = file_get_contents($manifestPath);
if ($manifestContent === false) {
    send_json_response(false, "Error al leer el contenido del manifiesto.", null, 500);
}

$manifest = json_decode($manifestContent, true);
if (json_last_error() !== JSON_ERROR_NONE) {
    send_json_response(false, "Error al decodificar el manifiesto: " . json_last_error_msg(), null, 500);
}

try {
    $eventManager = new EventManager($manifest["eventos"] ?? []);
    $timezone = new DateTimeZone("America/Argentina/Buenos_Aires");
    $now = new DateTime("now", $timezone);
    $until = (clone $now)->add(new DateInterval("PT6H"));

    $agenda = $eventManager->getEventsAgenda($until);

    send_json_response(true, "Agenda de eventos obtenida exitosamente.", [
        "server_time_iso" => $now->format(DateTime::ISO8601),
        "events_agenda" => $agenda,
    ]);

} catch (Exception $e) {
    error_log("Error en agenda.php: " . $e->getMessage());
    send_json_response(
        false,
        "Ocurrió un error en el servidor.",
        DEV ? ["details" => $e->getMessage(), "file" => $e->getFile(), "line" => $e->getLine()] : null, // Muestra detalles solo en DEV
        500
    );
}