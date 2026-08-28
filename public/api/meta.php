<?php

declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');

try {
    require __DIR__ . '/../../src/bootstrap.php';

    $sites = array_map(
        static fn(array $site): array => ['name' => $site['name']],
        SearchSites::available($featureGate)
    );

    echo json_encode([
        'ok' => true,
        'edition' => $featureGate->edition(),
        'tier' => $featureGate->tier(),
        'limits' => $featureGate->limits(),
        'features' => $featureGate->featureMatrix(),
        'search_sites' => $sites,
        'statuses' => $jobHunter->allowedStatuses(),
    ], JSON_UNESCAPED_SLASHES);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => $e->getMessage()]);
}
