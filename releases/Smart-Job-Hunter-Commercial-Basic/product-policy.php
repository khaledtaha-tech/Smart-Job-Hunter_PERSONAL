<?php
declare(strict_types=1);

function productPolicy(array $product): array {
    $edition = (string)($product['edition'] ?? 'commercial');
    $tier = (string)($product['tier'] ?? 'basic');
    if ($edition === 'personal') $tier = 'premium';

    $policies = [
        'basic' => [
            'tier' => 'basic',
            'max_profiles' => 1,
            'max_applications' => 20,
            'max_search_sites' => 3,
            'target_companies' => false,
            'csv_export' => false,
            'advanced_tracker' => false,
            'follow_ups' => false,
            'excel_transfer' => false,
            'database_backup' => false,
        ],
        'standard' => [
            'tier' => 'standard',
            'max_profiles' => 3,
            'max_applications' => 100,
            'max_search_sites' => 5,
            'target_companies' => true,
            'csv_export' => true,
            'advanced_tracker' => false,
            'follow_ups' => false,
            'excel_transfer' => false,
            'database_backup' => false,
        ],
        'premium' => [
            'tier' => 'premium',
            'max_profiles' => null,
            'max_applications' => null,
            'max_search_sites' => null,
            'target_companies' => true,
            'csv_export' => true,
            'advanced_tracker' => true,
            'follow_ups' => true,
            'excel_transfer' => true,
            'database_backup' => true,
        ],
    ];

    return $policies[$tier] ?? $policies['basic'];
}

function validateUserData(array $input, array $policy): void {
    $applications = isset($input['applications']) && is_array($input['applications']) ? $input['applications'] : [];
    $profiles = isset($input['profiles']) && is_array($input['profiles']) ? $input['profiles'] : [];
    $companies = isset($input['companies']) && is_array($input['companies']) ? $input['companies'] : [];

    if ($policy['max_applications'] !== null && count($applications) > $policy['max_applications']) {
        respond(['success' => false, 'message' => 'Application limit exceeded for this plan.'], 422);
    }
    if ($policy['max_profiles'] !== null && count($profiles) > $policy['max_profiles']) {
        respond(['success' => false, 'message' => 'Career profile limit exceeded for this plan.'], 422);
    }
    if (!$policy['target_companies'] && count($companies) > 0) {
        respond(['success' => false, 'message' => 'Target companies are not available in this plan.'], 422);
    }

    $basicStatuses = ['new', 'applied', 'rejected'];
    $advancedStatuses = ['new', 'interested', 'applied', 'interview', 'offer', 'rejected'];
    $allowedStatuses = $policy['advanced_tracker'] ? $advancedStatuses : $basicStatuses;
    foreach ($applications as $application) {
        if (!is_array($application)) respond(['success' => false, 'message' => 'Invalid application data.'], 422);
        $status = (string)($application['status'] ?? 'new');
        if (!in_array($status, $allowedStatuses, true)) respond(['success' => false, 'message' => 'Application status is not available in this plan.'], 422);
        if (!$policy['follow_ups'] && trim((string)($application['followUp'] ?? '')) !== '') respond(['success' => false, 'message' => 'Follow-up scheduling is not available in this plan.'], 422);
    }

    $siteOrder = ['google', 'linkedin', 'indeed', 'bayt', 'gulftalent', 'naukrigulf', 'glassdoor', 'jooble', 'tanqeeb', 'wuzzuf', 'ziprecruiter', 'careers'];
    $allowedSiteIds = $policy['max_search_sites'] === null ? $siteOrder : array_slice($siteOrder, 0, $policy['max_search_sites']);
    foreach ($profiles as $profile) {
        if (!is_array($profile)) respond(['success' => false, 'message' => 'Invalid career profile data.'], 422);
        $sites = isset($profile['sites']) && is_array($profile['sites']) ? $profile['sites'] : [];
        foreach ($sites as $site) {
            if (!in_array((string)$site, $allowedSiteIds, true)) respond(['success' => false, 'message' => 'A career profile contains a search site that is not available in this plan.'], 422);
        }
    }
}
