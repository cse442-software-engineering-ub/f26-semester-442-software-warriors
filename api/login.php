<?php
require __DIR__ . '/cors.php';
require __DIR__ . '/db.php';
require __DIR__ . '/require_auth.php';

header('Content-Type: application/json');

function loginFail(int $status, string $message): void
{
  http_response_code($status);
  echo json_encode(['login' => false, 'error' => $message]);
  exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
  loginFail(400, 'Login must be a POST request.');
}

$email = $_POST['email'] ?? '';
$password = $_POST['password'] ?? '';

if (!is_string($email) || !is_string($password)) {
  loginFail(400, 'Email and password must be plain text.');
}

$email = trim($email);

if ($email === '' || $password === '') {
  loginFail(400, 'Email and password are required.');
}

$stmt = $pdo->prepare('SELECT id, password_hash FROM users WHERE email = ?');
$stmt->execute([$email]);
$user = $stmt->fetch();

// Always run password_verify, even for an unknown email, so both
// failures take the same time and give the same message.
$hash = $user ? $user['password_hash'] : password_hash('timing-dummy', PASSWORD_DEFAULT);
$valid = password_verify($password, $hash);

if (!$user || !$valid) {
  loginFail(401, 'Incorrect email or password.');
}

if (password_needs_rehash($user['password_hash'], PASSWORD_DEFAULT)) {
  $stmt = $pdo->prepare('UPDATE users SET password_hash = ? WHERE id = ?');
  $stmt->execute([password_hash($password, PASSWORD_DEFAULT), $user['id']]);
}

session_regenerate_id(true);
$_SESSION['user_id'] = (int) $user['id'];

echo json_encode(['login' => true]);
