<?php
require __DIR__ . '/cors.php';
require __DIR__ . '/db.php';
// NOTE: do NOT require require_auth.php here, and do NOT call requireAuth().

header('Content-Type: application/json');

const SESSION_NAME = 'login_session_cookie'; // must match the name used in require_auth.php

function loginFail(int $status, string $message): void
{
  http_response_code($status);
  echo json_encode(['login' => false, 'error' => $message]);
  exit();
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

// Always run password_verify so unknown emails take the same time.
// Precomputed dummy hash (generate once with password_hash('x', PASSWORD_DEFAULT)).
$dummyHash = '$2y$10$usesomesillystringforsaleOeGZ4r1JfXJ1x0kqk3J9cE5dQp5Zy'; // replace with a real hash
$hash = $user ? $user['password_hash'] : $dummyHash;
$valid = password_verify($password, $hash);

if (!$user || !$valid) {
  loginFail(401, 'Incorrect email or password.');
}

if (password_needs_rehash($user['password_hash'], PASSWORD_DEFAULT)) {
  $stmt = $pdo->prepare('UPDATE users SET password_hash = ? WHERE id = ?');
  $stmt->execute([password_hash($password, PASSWORD_DEFAULT), $user['id']]);
}

session_name(SESSION_NAME);
session_set_cookie_params([
  'lifetime' => 0,
  'path'     => '/CSE442/2026-Fall/cse-442ab/',
  'secure'   => true,
  'httponly' => true,
  'samesite' => 'None', // needed for cross-site frontend; use 'Lax' if same-site
]);

session_start();
session_regenerate_id(true); // new ID, old one discarded (prevents fixation)
$_SESSION = ['user_id' => (int) $user['id']];

echo json_encode(['login' => true]);