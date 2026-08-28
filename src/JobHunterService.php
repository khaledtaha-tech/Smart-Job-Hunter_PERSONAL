<?php

declare(strict_types=1);

final class JobHunterService
{
    public function __construct(
        private PDO $pdo,
        private FeatureGate $gate
    ) {
    }

    public function dashboardCounts(): array
    {
        return [
            'career_fields' => (int)$this->pdo->query('SELECT COUNT(*) FROM career_fields')->fetchColumn(),
            'applications' => (int)$this->pdo->query('SELECT COUNT(*) FROM applications')->fetchColumn(),
            'companies' => (int)$this->pdo->query('SELECT COUNT(*) FROM target_companies')->fetchColumn(),
            'open_reminders' => (int)$this->pdo->query('SELECT COUNT(*) FROM reminders WHERE is_done = 0')->fetchColumn(),
        ];
    }

    public function careerFields(): array
    {
        return $this->pdo->query('SELECT * FROM career_fields ORDER BY created_at DESC')->fetchAll();
    }

    public function addCareerField(string $name): int
    {
        $name = trim($name);
        if ($name === '') {
            throw new InvalidArgumentException('Career field name is required.');
        }

        $count = (int)$this->pdo->query('SELECT COUNT(*) FROM career_fields')->fetchColumn();
        $this->gate->assertWithinLimit('career_fields', $count);

        $stmt = $this->pdo->prepare('INSERT INTO career_fields (name) VALUES (:name)');
        $stmt->execute(['name' => $name]);
        return (int)$this->pdo->lastInsertId();
    }

    public function applications(): array
    {
        $sql = 'SELECT a.*, c.name AS career_field_name FROM applications a LEFT JOIN career_fields c ON c.id = a.career_field_id ORDER BY a.updated_at DESC, a.id DESC';
        return $this->pdo->query($sql)->fetchAll();
    }

    public function addApplication(array $data): int
    {
        $count = (int)$this->pdo->query('SELECT COUNT(*) FROM applications')->fetchColumn();
        $this->gate->assertWithinLimit('applications', $count);

        $companyName = trim((string)($data['company_name'] ?? ''));
        $jobTitle = trim((string)($data['job_title'] ?? ''));
        if ($companyName === '' || $jobTitle === '') {
            throw new InvalidArgumentException('Company name and job title are required.');
        }

        $status = (string)($data['status'] ?? 'New');
        if (!in_array($status, $this->allowedStatuses(), true)) {
            throw new InvalidArgumentException('The selected application status is not available on this plan.');
        }

        $stmt = $this->pdo->prepare(
            'INSERT INTO applications (career_field_id, company_name, job_title, job_url, source_site, status, applied_at, notes)
             VALUES (:career_field_id, :company_name, :job_title, :job_url, :source_site, :status, :applied_at, :notes)'
        );
        $stmt->execute([
            'career_field_id' => !empty($data['career_field_id']) ? (int)$data['career_field_id'] : null,
            'company_name' => $companyName,
            'job_title' => $jobTitle,
            'job_url' => trim((string)($data['job_url'] ?? '')) ?: null,
            'source_site' => trim((string)($data['source_site'] ?? '')) ?: null,
            'status' => $status,
            'applied_at' => !empty($data['applied_at']) ? $data['applied_at'] : null,
            'notes' => trim((string)($data['notes'] ?? '')) ?: null,
        ]);

        return (int)$this->pdo->lastInsertId();
    }

    public function updateApplicationStatus(int $id, string $status): void
    {
        if (!in_array($status, $this->allowedStatuses(), true)) {
            throw new InvalidArgumentException('The selected application status is not available on this plan.');
        }

        $stmt = $this->pdo->prepare('UPDATE applications SET status = :status, updated_at = CURRENT_TIMESTAMP WHERE id = :id');
        $stmt->execute(['status' => $status, 'id' => $id]);
    }

    public function targetCompanies(): array
    {
        $this->gate->assertFeature('target_companies');
        return $this->pdo->query('SELECT * FROM target_companies ORDER BY priority DESC, name ASC')->fetchAll();
    }

    public function addTargetCompany(array $data): int
    {
        $this->gate->assertFeature('target_companies');
        $name = trim((string)($data['name'] ?? ''));
        if ($name === '') {
            throw new InvalidArgumentException('Company name is required.');
        }

        $stmt = $this->pdo->prepare('INSERT INTO target_companies (name, website, priority, notes) VALUES (:name, :website, :priority, :notes)');
        $stmt->execute([
            'name' => $name,
            'website' => trim((string)($data['website'] ?? '')) ?: null,
            'priority' => max(1, min(5, (int)($data['priority'] ?? 3))),
            'notes' => trim((string)($data['notes'] ?? '')) ?: null,
        ]);
        return (int)$this->pdo->lastInsertId();
    }

    public function reminders(): array
    {
        $this->gate->assertFeature('follow_up_reminders');
        $sql = 'SELECT r.*, a.company_name, a.job_title FROM reminders r JOIN applications a ON a.id = r.application_id WHERE r.is_done = 0 ORDER BY r.remind_at ASC';
        return $this->pdo->query($sql)->fetchAll();
    }

    public function addReminder(int $applicationId, string $remindAt, ?string $note): int
    {
        $this->gate->assertFeature('follow_up_reminders');
        if ($applicationId <= 0 || trim($remindAt) === '') {
            throw new InvalidArgumentException('Application and reminder date are required.');
        }

        $stmt = $this->pdo->prepare('INSERT INTO reminders (application_id, remind_at, note) VALUES (:application_id, :remind_at, :note)');
        $stmt->execute([
            'application_id' => $applicationId,
            'remind_at' => $remindAt,
            'note' => trim((string)$note) ?: null,
        ]);
        return (int)$this->pdo->lastInsertId();
    }

    public function dueAlerts(): array
    {
        if (!$this->gate->allows('in_app_alerts')) {
            return [];
        }

        $sql = 'SELECT r.*, a.company_name, a.job_title FROM reminders r JOIN applications a ON a.id = r.application_id WHERE r.is_done = 0 AND r.remind_at <= NOW() ORDER BY r.remind_at ASC';
        return $this->pdo->query($sql)->fetchAll();
    }

    public function allowedStatuses(): array
    {
        if ($this->gate->allows('advanced_tracker')) {
            return ['New', 'Interested', 'Applied', 'Interview', 'Offer', 'Rejected'];
        }

        return ['New', 'Applied', 'Closed'];
    }
}
