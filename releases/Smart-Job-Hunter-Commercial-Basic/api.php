<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');

$configFile = __DIR__ . '/config.php';
$productFile = __DIR__ . '/product-config.php';
$policyFile = __DIR__ . '/product-policy.php';

function respond(array $data, int $status = 200): never {
    http_response_code($status);
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

if (!is_file($configFile)) {
    respond(['installed' => false, 'message' => 'Installation required.'], 503);
}
if (!is_file($policyFile)) {
    respond(['installed' => false, 'message' => 'Product policy file is missing.'], 503);
}

$config = require $configFile;
$product = is_file($productFile) ? require $productFile : ['edition' => 'personal', 'tier' => 'premium'];
require_once $policyFile;
$policy = productPolicy($product);

session_name('smart_job_hunter_session');
session_set_cookie_params([
    'lifetime' => 0,
    'path' => '/',
    'secure' => (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off'),
    'httponly' => true,
    'samesite' => 'Lax',
]);
session_start();

function database(array $config): PDO {
    static $pdo = null;
    if ($pdo instanceof PDO) return $pdo;
    $db = $config['database'];
    $dsn = sprintf('mysql:host=%s;dbname=%s;charset=utf8mb4', $db['host'], $db['name']);
    $pdo = new PDO($dsn, $db['user'], $db['password'], [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ]);
    return $pdo;
}

function jsonInput(): array {
    $raw = file_get_contents('php://input');
    if ($raw === false || strlen($raw) > 5 * 1024 * 1024) respond(['success' => false, 'message' => 'Invalid request size.'], 413);
    $data = json_decode($raw, true);
    return is_array($data) ? $data : [];
}

function requireUser(): int {
    if (empty($_SESSION['user_id'])) respond(['success' => false, 'message' => 'Authentication required.'], 401);
    return (int) $_SESSION['user_id'];
}

function loadUserData(PDO $pdo, int $userId): ?array {
    $statement = $pdo->prepare('SELECT data_json FROM user_data WHERE user_id = ?');
    $statement->execute([$userId]);
    $row = $statement->fetch();
    if (!$row) return null;
    $data = json_decode((string)$row['data_json'], true);
    return is_array($data) ? $data : null;
}

function saveUserData(PDO $pdo, int $userId, array $data): void {
    $json = json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    if ($json === false) respond(['success' => false, 'message' => 'Invalid data.'], 422);
    $statement = $pdo->prepare('INSERT INTO user_data (user_id, data_json, updated_at) VALUES (?, ?, NOW()) ON DUPLICATE KEY UPDATE data_json = VALUES(data_json), updated_at = NOW()');
    $statement->execute([$userId, $json]);
}

try {
    $action = $_GET['action'] ?? 'session';
    $pdo = database($config);

    if ($action === 'session') {
        $productInfo = ['edition' => (string)($product['edition'] ?? 'commercial'), 'tier' => (string)$policy['tier'], 'policy' => $policy];
        if (empty($_SESSION['user_id'])) respond(['installed' => true, 'authenticated' => false, 'product' => $productInfo]);
        $statement = $pdo->prepare('SELECT id, full_name, email FROM users WHERE id = ? AND active = 1');
        $statement->execute([(int) $_SESSION['user_id']]);
        $user = $statement->fetch();
        if (!$user) { session_destroy(); respond(['installed' => true, 'authenticated' => false, 'product' => $productInfo]); }
        respond(['installed' => true, 'authenticated' => true, 'product' => $productInfo, 'user' => ['id' => (int)$user['id'], 'fullName' => $user['full_name'], 'email' => $user['email']]]);
    }

    if ($action === 'login' && $_SERVER['REQUEST_METHOD'] === 'POST') {
        $input = jsonInput();
        $email = strtolower(trim((string)($input['email'] ?? '')));
        $password = (string)($input['password'] ?? '');
        $attempts = (int)($_SESSION['login_attempts'] ?? 0);
        $lastAttempt = (int)($_SESSION['last_attempt'] ?? 0);
        if ($attempts >= 6 && time() - $lastAttempt < 300) respond(['success' => false, 'message' => 'Too many attempts. Try again in five minutes.'], 429);
        $statement = $pdo->prepare('SELECT id, full_name, email, password_hash FROM users WHERE email = ? AND active = 1 LIMIT 1');
        $statement->execute([$email]);
        $user = $statement->fetch();
        if (!$user || !password_verify($password, $user['password_hash'])) {
            $_SESSION['login_attempts'] = $attempts + 1;
            $_SESSION['last_attempt'] = time();
            respond(['success' => false, 'message' => 'Invalid email or password.'], 401);
        }
        session_regenerate_id(true);
        $_SESSION['user_id'] = (int)$user['id'];
        unset($_SESSION['login_attempts'], $_SESSION['last_attempt']);
        respond(['success' => true, 'user' => ['id' => (int)$user['id'], 'fullName' => $user['full_name'], 'email' => $user['email']]]);
    }

    if ($action === 'logout' && $_SERVER['REQUEST_METHOD'] === 'POST') {
        $_SESSION = [];
        session_destroy();
        respond(['success' => true]);
    }

    if ($action === 'load') {
        $userId = requireUser();
        respond(['success' => true, 'data' => loadUserData($pdo, $userId)]);
    }

    if ($action === 'save' && $_SERVER['REQUEST_METHOD'] === 'POST') {
        $userId = requireUser();
        $input = jsonInput();
        validateUserData($input, $policy);
        saveUserData($pdo, $userId, $input);
        respond(['success' => true, 'savedAt' => gmdate('c')]);
    }

    if ($action === 'backup') {
        if (!$policy['database_backup']) respond(['success' => false, 'message' => 'Database backup is not available in this plan.'], 403);
        $userId = requireUser();
        respond([
            'version' => 2,
            'exportedAt' => gmdate('c'),
            'product' => ['edition' => (string)($product['edition'] ?? 'commercial'), 'tier' => (string)$policy['tier']],
            'data' => loadUserData($pdo, $userId),
        ]);
    }

    if ($action === 'restore' && $_SERVER['REQUEST_METHOD'] === 'POST') {
        if (!$policy['database_backup']) respond(['success' => false, 'message' => 'Database restore is not available in this plan.'], 403);
        $userId = requireUser();
        $input = jsonInput();
        $data = isset($input['data']) && is_array($input['data']) ? $input['data'] : [];
        validateUserData($data, $policy);
        saveUserData($pdo, $userId, $data);
        respond(['success' => true, 'restoredAt' => gmdate('c')]);
    }

    respond(['success' => false, 'message' => 'Unknown action.'], 404);
} catch (Throwable $error) {
    error_log('Smart Job Hunter: ' . $error->getMessage());
    respond(['success' => false, 'message' => 'Server error. Check the installation settings.'], 500);
}
