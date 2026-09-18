<?php
require __DIR__ . '/cors.php';
require __DIR__ . '/db.php';

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
  http_response_code(405);
  echo json_encode(['error' => 'Method not allowed. Use POST.']);
  exit;
}

$raw  = file_get_contents('php://input');
$data = json_decode($raw, true);

$name     = trim($data['name']     ?? '');
$email    = trim($data['email']    ?? '');
$phone    = trim($data['phone']    ?? '');
$password = $data['password']      ?? '';

$errors = [];
if ($name === '') {
  $errors['name'] = 'Name is required.';
}
if ($email === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
  $errors['email'] = 'A valid email is required.';
}
if ($phone === '' || !preg_match('/^\d{7,15}$/', $phone)) {
  $errors['phone'] = 'A valid phone number (digits only, 7-15 characters) is required.';
}
if (strlen($password) < 8) {
  $errors['password'] = 'Password must be at least 8 characters.';
}

if (!empty($errors)) {
  http_response_code(422);
  echo json_encode(['errors' => $errors]);
  exit;
}

$stmt = $pdo->prepare('SELECT id FROM users WHERE email = ? OR phone = ?');
$stmt->execute([$email, $phone]);
if ($stmt->fetch()) {
  http_response_code(409);
  echo json_encode(['error' => 'An account with that email or phone number already exists.']);
  exit;
}

$passwordHash = password_hash($password, PASSWORD_DEFAULT);

$stmt = $pdo->prepare(
  'INSERT INTO users (name, email, phone, password_hash) VALUES (?, ?, ?, ?)'
);
$stmt->execute([$name, $email, $phone, $passwordHash]);

http_response_code(201);
echo json_encode([
  'message' => 'Account created successfully.',
  'user' => [
    'id'    => (int) $pdo->lastInsertId(),
    'name'  => $name,
    'email' => $email,
    'phone' => $phone,
  ],
]);
