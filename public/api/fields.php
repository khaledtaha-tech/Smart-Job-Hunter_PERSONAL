<?php

declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');

try {
    require __DIR__ . '/../../src/bootstrap.php';

    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $payload = json_decode((string)file_get_contents('php://input'), true) ?: $_POST;
        $id = $jobHunter->addCareerField((string)($payload['name'] ?? ''));
        http_response_code(201);
        echo json_encode(['ok' => true, 'id' => $id]);
        exit;
    }

    echo json_encode(['ok' => true, 'items' => $jobHunter->careerFields()]);
} catch (Throwable $e) {
    http_response_code($e instanceof RuntimeException || $e instanceof InvalidArgumentException ? 422 : 500);
    echo json_encode(['ok' => false, 'error' => $e->getMessage()]);
}
