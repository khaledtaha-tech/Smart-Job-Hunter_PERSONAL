<?php

declare(strict_types=1);

final class FeatureGate
{
    private const TIER_RANK = [
        'basic' => 1,
        'standard' => 2,
        'premium' => 3,
    ];

    private const LIMITS = [
        'basic' => [
            'career_fields' => 1,
            'applications' => 20,
            'search_sites' => 3,
        ],
        'standard' => [
            'career_fields' => 3,
            'applications' => 100,
            'search_sites' => 5,
        ],
        'premium' => [
            'career_fields' => null,
            'applications' => null,
            'search_sites' => null,
        ],
    ];

    private const FEATURES = [
        'target_companies' => 'standard',
        'csv_export' => 'standard',
        'advanced_tracker' => 'premium',
        'follow_up_reminders' => 'premium',
        'in_app_alerts' => 'premium',
        'excel_import_export' => 'premium',
        'database_backup' => 'premium',
        'all_search_sites' => 'premium',
    ];

    public function __construct(private array $config)
    {
    }

    public function edition(): string
    {
        return $this->config['edition'];
    }

    public function tier(): string
    {
        return $this->isPersonal() ? 'premium' : $this->config['tier'];
    }

    public function isPersonal(): bool
    {
        return $this->config['edition'] === 'personal';
    }

    public function isCommercial(): bool
    {
        return !$this->isPersonal();
    }

    public function allows(string $feature): bool
    {
        if ($this->isPersonal()) {
            return true;
        }

        if (!isset(self::FEATURES[$feature])) {
            return false;
        }

        return self::TIER_RANK[$this->tier()] >= self::TIER_RANK[self::FEATURES[$feature]];
    }

    public function limit(string $resource): ?int
    {
        if ($this->isPersonal()) {
            return null;
        }

        return self::LIMITS[$this->tier()][$resource] ?? null;
    }

    public function assertFeature(string $feature): void
    {
        if (!$this->allows($feature)) {
            throw new RuntimeException('This feature requires a higher plan.');
        }
    }

    public function assertWithinLimit(string $resource, int $currentCount): void
    {
        $limit = $this->limit($resource);

        if ($limit !== null && $currentCount >= $limit) {
            throw new RuntimeException('Your current plan limit has been reached.');
        }
    }

    public function featureMatrix(): array
    {
        $result = [];

        foreach (self::FEATURES as $feature => $minimumTier) {
            $result[$feature] = $this->allows($feature);
        }

        return $result;
    }

    public function limits(): array
    {
        return [
            'career_fields' => $this->limit('career_fields'),
            'applications' => $this->limit('applications'),
            'search_sites' => $this->limit('search_sites'),
        ];
    }
}
