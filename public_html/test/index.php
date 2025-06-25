<?php
	define('CLIENT_ID', basename(__DIR__));
	define('VERSION', '');
	require_once(defined('VERSION') && VERSION ? dirname(__DIR__,2) . '/core/' . VERSION . '/src/AppKernel.php' : dirname(__DIR__,2) . '/core/src/AppKernel.php');
	launchApp();