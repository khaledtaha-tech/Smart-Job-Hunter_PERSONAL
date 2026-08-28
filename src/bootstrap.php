<?php

declare(strict_types=1);

require_once __DIR__ . '/FeatureGate.php';
require_once __DIR__ . '/Database.php';
require_once __DIR__ . '/SearchSites.php';
require_once __DIR__ . '/JobHunterService.php';

$appConfig = require __DIR__ . '/../config/app.php';
$dbConfig = require __DIR__ . '/../config/database.php';

date_default_timezone_set($appConfig['timezone']);

$featureGate = new FeatureGate($appConfig);
$database = new Database($dbConfig);
$pdo = $database->pdo();
$jobHunter = new JobHunterService($pdo, $featureGate);
