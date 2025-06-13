<?php
$clientId = basename(__DIR__);

// Define la URL pública que apunta a tu directorio 'public_html'
$baseUrl = 'https://loc.ar/';

require_once __DIR__ . '/../../loc-ar/src/AppKernel.php';

// Pasa la nueva variable a tu aplicación
launchApp($clientId, $baseUrl);