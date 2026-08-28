<?php

declare(strict_types=1);

$releaseFile = __DIR__ . '/release.php';
$release = file_exists($releaseFile) ? require $releaseFile : [];

$edition = strtolower((string)($release['edition'] ?? getenv('APP_EDITION') ?: 'personal'));
$defaultTier = strtolower((string)($release['default_tier'] ?? ($edition === 'personal' ? 'premium' : 'basic')));
$tier = strtolower((string)(getenv('APP_TIER') ?: $defaultTier));

if (!in_array($edition, ['personal', 'commercial'], true)) {
    $edition = 'commercial';
}

if (!in_array($tier, ['basic', 'standard', 'premium'], true)) {
    $tier = 'basic';
}

if ($edition === 'personal') {
    $tier = 'premium';
}

return [
    'name' => 'Smart Job Hunter',
    'edition' => $edition,
    'tier' => $tier,
    'timezone' => getenv('APP_TIMEZONE') ?: 'Asia/Riyadh',
    'personal_focus' => [
        'title' => 'Production Manager - Plastic Pipe Extrusion',
        'keywords' => ['Production Manager', 'Extrusion', 'HDPE', 'PVC', 'uPVC', 'CPVC', 'Plastic Pipes'],
    ],
];
