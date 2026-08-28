<?php

declare(strict_types=1);

final class SearchSites
{
    private const SITES = [
        ['name' => 'LinkedIn Jobs', 'url' => 'https://www.linkedin.com/jobs/search/?keywords=%s'],
        ['name' => 'Indeed', 'url' => 'https://www.indeed.com/jobs?q=%s'],
        ['name' => 'Bayt', 'url' => 'https://www.bayt.com/en/international/jobs/%s-jobs/'],
        ['name' => 'Naukrigulf', 'url' => 'https://www.naukrigulf.com/%s-jobs'],
        ['name' => 'Glassdoor', 'url' => 'https://www.glassdoor.com/Job/jobs.htm?sc.keyword=%s'],
        ['name' => 'GulfTalent', 'url' => 'https://www.gulftalent.com/jobs?keywords=%s'],
        ['name' => 'Google Jobs', 'url' => 'https://www.google.com/search?q=%s+jobs'],
        ['name' => 'ZipRecruiter', 'url' => 'https://www.ziprecruiter.com/jobs-search?search=%s'],
        ['name' => 'Jooble', 'url' => 'https://jooble.org/SearchResult?rgns=&ukw=%s'],
        ['name' => 'CareerJet', 'url' => 'https://www.careerjet.com/search/jobs?s=%s'],
    ];

    public static function available(FeatureGate $gate): array
    {
        $limit = $gate->limit('search_sites');
        return $limit === null ? self::SITES : array_slice(self::SITES, 0, $limit);
    }

    public static function all(): array
    {
        return self::SITES;
    }

    public static function buildUrl(array $site, string $query): string
    {
        $encoded = rawurlencode(trim($query));
        return sprintf($site['url'], $encoded);
    }
}
