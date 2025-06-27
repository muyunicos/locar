<?php
set_time_limit(0);

if (function_exists('apache_setenv')) {
    @apache_setenv('no-gzip', 1);
}
@ini_set('zlib.output_compression', 0);

@ini_set('output_buffering', 'off');

while (ob_get_level() != 0) {
    ob_end_flush();
}
@ini_set('implicit_flush', 1);

require_once __DIR__ . '/api_bootstrap.php';

header('Content-Type: text/event-stream');
header('Cache-Control: no-cache');
header('Connection: keep-alive');

$dataDirectory = CLIENT_PATH . "/datos/";
$lastModificationTimes = [];

$modulesToWatch = [];
if (isset($_GET['watch_modules'])) {
    $decodedModules = json_decode($_GET['watch_modules'], true);
    if (is_array($decodedModules)) {
        $modulesToWatch = $decodedModules;
    }
}

$menuFiles = [];
if (!empty($modulesToWatch)) {
    foreach ($modulesToWatch as $moduleId) {
        $filePath = $dataDirectory . $moduleId . ".json";
        if (file_exists($filePath)) {
            $menuFiles[] = $filePath;
        }
    }
} else {
    $menuFiles = glob($dataDirectory . "*.json");
}


foreach ($menuFiles as $file) {
    $menuId = pathinfo(basename($file), PATHINFO_FILENAME);
    $lastModificationTimes[$menuId] = filemtime($file);
}

echo "event: watching_files\n";
echo "data: " . json_encode(['files' => array_map('basename', $menuFiles)]) . "\n\n";
flush();

while (true) {
    if (connection_aborted()) {
        break;
    }

    clearstatcache();

    $currentFiles = [];
    if (!empty($modulesToWatch)) {
        foreach ($modulesToWatch as $moduleId) {
            $filePath = $dataDirectory . $moduleId . ".json";
            if (file_exists($filePath)) {
                $currentFiles[] = $filePath;
            }
        }
    } else {
        $currentFiles = glob($dataDirectory . "*.json");
    }

    $currentFileMap = [];
    foreach ($currentFiles as $file) {
        $fileName = basename($file);
        $menuId = pathinfo($fileName, PATHINFO_FILENAME);
        $currentFileMap[$menuId] = $file;

        $currentMTime = filemtime($file);

        if (isset($lastModificationTimes[$menuId])) {
            if ($currentMTime > $lastModificationTimes[$menuId]) {
                echo "event: menu_update\n";
                echo "data: " . json_encode(['menu_id' => $menuId, 'timestamp' => $currentMTime]) . "\n\n";
                $lastModificationTimes[$menuId] = $currentMTime;
            }
        } else {
            echo "event: menu_update\n";
            echo "data: " . json_encode(['menu_id' => $menuId, 'timestamp' => $currentMTime, 'new' => true]) . "\n\n";
            $lastModificationTimes[$menuId] = $currentMTime;
        }
    }

    $deletedMenus = array_diff_key($lastModificationTimes, $currentFileMap);
    foreach (array_keys($deletedMenus) as $deletedMenuId) {
        unset($lastModificationTimes[$deletedMenuId]);
    }

    echo ": keep-alive\n\n";

    flush();
    sleep(2);
}