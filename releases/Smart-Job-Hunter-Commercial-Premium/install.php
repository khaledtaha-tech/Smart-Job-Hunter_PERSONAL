<?php
declare(strict_types=1);

$configFile = __DIR__ . '/config.php';
$productFile = __DIR__ . '/product-config.php';
$product = is_file($productFile) ? require $productFile : ['edition' => 'commercial', 'tier' => 'basic'];
$defaultFullName = (($product['edition'] ?? 'commercial') === 'personal') ? 'Khaled Taha' : '';
if (is_file($configFile)) {
    header('Location: ./');
    exit;
}

$error = '';
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $host = trim((string)($_POST['db_host'] ?? 'localhost'));
    $name = trim((string)($_POST['db_name'] ?? ''));
    $user = trim((string)($_POST['db_user'] ?? ''));
    $password = (string)($_POST['db_password'] ?? '');
    $fullName = trim((string)($_POST['full_name'] ?? ''));
    $email = strtolower(trim((string)($_POST['email'] ?? '')));
    $adminPassword = (string)($_POST['admin_password'] ?? '');
    if (!$host || !$name || !$user || !$fullName || !filter_var($email, FILTER_VALIDATE_EMAIL) || strlen($adminPassword) < 8) {
        $error = 'Please complete all fields. The account password must contain at least 8 characters.';
    } else {
        try {
            $pdo = new PDO("mysql:host={$host};dbname={$name};charset=utf8mb4", $user, $password, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_EMULATE_PREPARES => false]);
            $pdo->exec("CREATE TABLE IF NOT EXISTS users (id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY, full_name VARCHAR(120) NOT NULL, email VARCHAR(190) NOT NULL UNIQUE, password_hash VARCHAR(255) NOT NULL, active TINYINT(1) NOT NULL DEFAULT 1, created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
            $pdo->exec("CREATE TABLE IF NOT EXISTS user_data (user_id INT UNSIGNED PRIMARY KEY, data_json LONGTEXT NOT NULL, updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP, CONSTRAINT fk_user_data_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
            $statement = $pdo->prepare('INSERT INTO users (full_name, email, password_hash) VALUES (?, ?, ?)');
            $statement->execute([$fullName, $email, password_hash($adminPassword, PASSWORD_DEFAULT)]);
            $config = "<?php\nreturn " . var_export(['database' => ['host' => $host, 'name' => $name, 'user' => $user, 'password' => $password]], true) . ";\n";
            if (file_put_contents($configFile, $config, LOCK_EX) === false) throw new RuntimeException('Could not write config.php.');
            chmod($configFile, 0640);
            header('Location: ./'); exit;
        } catch (Throwable $issue) {
            $error = 'Installation failed: ' . htmlspecialchars($issue->getMessage(), ENT_QUOTES, 'UTF-8');
        }
    }
}
?>
<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Install Smart Job Hunter</title><style>
*{box-sizing:border-box}body{margin:0;min-height:100vh;display:grid;place-items:center;padding:25px;background:#f2f6fc;color:#172238;font-family:Arial,sans-serif}.card{width:min(650px,100%);padding:30px;background:#fff;border:1px solid #dfe7f2;border-radius:16px;box-shadow:0 20px 55px #1a31551c}h1{margin:0 0 6px;font-size:28px}p{margin:0 0 22px;color:#68758b;font-size:13px}.grid{display:grid;grid-template-columns:1fr 1fr;gap:13px}label{display:block;color:#526077;font-size:11px;font-weight:700}.wide{grid-column:1/-1}input{width:100%;height:42px;margin-top:6px;padding:0 10px;border:1px solid #d9e2ef;border-radius:8px;font:inherit}button{width:100%;height:44px;margin-top:20px;border:0;border-radius:9px;background:#3867e8;color:#fff;font-weight:700;cursor:pointer}.error{margin-bottom:18px;padding:11px;border-radius:8px;background:#fff0f0;color:#b53d3d;font-size:12px}.note{margin-top:16px;color:#8490a3;font-size:10px}@media(max-width:560px){.card{padding:22px}.grid{grid-template-columns:1fr}.wide{grid-column:auto}}
</style></head><body><main class="card"><h1>Smart Job Hunter</h1><p>One-time installation — connect the MySQL database and create the owner account.</p><?php if ($error): ?><div class="error"><?= $error ?></div><?php endif; ?><form method="post"><div class="grid"><label>Database host<input name="db_host" value="<?= htmlspecialchars($_POST['db_host'] ?? 'localhost') ?>" required></label><label>Database name<input name="db_name" value="<?= htmlspecialchars($_POST['db_name'] ?? '') ?>" required></label><label>Database username<input name="db_user" value="<?= htmlspecialchars($_POST['db_user'] ?? '') ?>" required></label><label>Database password<input type="password" name="db_password"></label><label class="wide">Your full name<input name="full_name" value="<?= htmlspecialchars($_POST['full_name'] ?? $defaultFullName) ?>" required></label><label>Email<input type="email" name="email" value="<?= htmlspecialchars($_POST['email'] ?? '') ?>" required></label><label>Account password<input type="password" name="admin_password" minlength="8" required></label></div><button>Install application</button></form><div class="note">After installation, this page locks automatically. Keep your database credentials private.</div></main></body></html>
