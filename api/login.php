<?php
require __DIR__ . '/cors.php';
require __DIR__ . '/db.php';
//require __DIR__ . '/require_auth.php';

header('Content-Type: application/json');

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
  exit;
}

$stmt = $pdo->prepare('SELECT id, password_hash, isCaregiver, patientEmail FROM users WHERE email = ?');
$stmt->execute([$email]);
$user = $stmt->fetch();

// Always run password_verify, even for an unknown email, so both
// failures take the same time and give the same message.
$hash = $user ? $user['password_hash'] : password_hash('timing-dummy', PASSWORD_DEFAULT);
$valid = password_verify($password, $hash);

if (!$user || !$valid) {
  loginFail(401, 'Incorrect email or password.');
  exit();
}

// Only reach here on successful authentication.
if (password_needs_rehash($user['password_hash'], PASSWORD_DEFAULT)) {
  $stmt = $pdo->prepare('UPDATE users SET password_hash = ? WHERE id = ?');
  $stmt->execute([password_hash($password, PASSWORD_DEFAULT), $user['id']]);
}

// Re-enable cookies and start a fresh session only after auth passes.
ini_set('session.use_cookies', '1');
session_set_cookie_params([
    'secure'   => true,
    'httponly' => true,
    'samesite' => 'None',
]);
session_start();
session_regenerate_id(true);
$_SESSION['user_id'] = (int) $user['id'];
$_SESSION['isCaregiver'] = (bool) $user['isCaregiver']; //sets new variable to PHPSESS cookie for caregivers

if (!$user['isCaregiver']) {
  echo json_encode(['login' => true]);
} else {
  $stmt = $pdo->prepare('SELECT id, password_hash, isCaregiver, patientEmail FROM users WHERE email = ?');
  $stmt->execute($user['patientEmail']);
  $patient = $stmt->fetch(); 
  $_SESSION['patientID'] = $patient['id']; //set patientID for backend fetches to get info to show to caregivers
  echo json_encode([
    'login' => true, 
    'isCaregiver' => $user['isCaregiver'],  
    'patientInfo' => $patient ])
}