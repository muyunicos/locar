<?php
    define('CLIENT_PATH', defined('DEV_BRANCH') && DEV_BRANCH ? dirname(__DIR__,3) . '/public_html/' . CLIENT_ID : dirname(__DIR__,2) . '/public_html/' . CLIENT_ID);
    define('DATA_PATH', CLIENT_PATH . '/datos');
    define('PUBLIC_URL', defined('DEV_BRANCH') && DEV_BRANCH ? 'https://loc.ar/app/' . DEV_BRANCH : 'https://loc.ar/app');
    define('PUBLIC_PATH', defined('DEV_BRANCH') && DEV_BRANCH ? dirname(__DIR__,3) . '/public_html/app/' . DEV_BRANCH : dirname(__DIR__,2) . '/public_html/app');
    define('PRIVATE_PATH', dirname(__DIR__));