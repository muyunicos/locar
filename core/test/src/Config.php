<?php
    if (!defined('CLIENT_ID')) {
            define('CLIENT_ID', basename(dirname($_SERVER['DOCUMENT_ROOT'])));
        }
    define ('CLIENT_PATH', defined('DEV_BRANCH') && DEV_BRANCH ? dirname(__DIR__,3) . '/public_html/' . CLIENT_ID : dirname(__DIR__,2) . '/public_html/' . CLIENT_ID);
    define ('CLIENT_URL', "https://" . $_SERVER['HTTP_HOST'] . rtrim(dirname($_SERVER['PHP_SELF']), '/\\'));
    define ('PUBLIC_URL', defined('DEV_BRANCH') && DEV_BRANCH ? 'https://' . implode('.', array_slice(explode('.', parse_url(CLIENT_URL, PHP_URL_HOST) ?? ''), -2)) . '/app/' . DEV_BRANCH : 'https://' . implode('.', array_slice(explode('.', parse_url(CLIENT_URL, PHP_URL_HOST) ?? ''), -2)) . '/app');
    define ('PUBLIC_PATH', defined('DEV_BRANCH') && DEV_BRANCH ? dirname(__DIR__,3) . '/public_html/app/' . DEV_BRANCH : dirname(__DIR__,2) . '/public_html/app');
    define ('PRIVATE_PATH', dirname(__DIR__));