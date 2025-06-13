<?php
$clientId = basename(__DIR__);

$baseUrl = 'https://loc.ar/';

require_once __DIR__ . '/../../loc-ar/src/AppKernel.php';

launchApp($clientId, $baseUrl);