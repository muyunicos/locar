<?php
	define('CLIENT_ID', basename(__DIR__));
	define('DEV_BRANCH', 'v0.1');
	require_once(defined('DEV_BRANCH') && DEV_BRANCH ? dirname(__DIR__,2) . '/core/' . DEV_BRANCH . '/src/AppKernel.php' : dirname(__DIR__,2) . '/core/src/AppKernel.php');
	launchApp();