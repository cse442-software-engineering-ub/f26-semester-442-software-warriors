<?php
ini_set('display_errors', 1);
error_reporting(E_ALL);
require __DIR__ . '/cors.php';
require __DIR__ . '/db.php';
session_set_cookie_params([
    'lifetime' => 0,
    'path'     => '/',
    'domain'   => '',
    'secure'   => true,   // required when SameSite=None
    'httponly' => true,
    'samesite' => 'None'  // allows cross-site cookie sending
]);
session_start();


header('Content-Type: application/json');

// Check if OTP has been verified
if (!isset($_SESSION['otp_verified']) || !isset($_SESSION['reset_email'])) {
    http_response_code(403);
    echo json_encode(['error' => 'Unauthorized. Please verify your OTP first.']);
    exit();
}

if ($_SERVER["REQUEST_METHOD"] !== "POST") {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed. Use POST.']);
    exit();
}

$password = $_POST['password'] ?? '';
$confirm_password = $_POST['confirmPassword'] ?? '';

if (empty($password) || empty($confirm_password)) {
    http_response_code(400);
    echo json_encode(['error' => 'Both password fields are required.']);
    exit();
}

if ($password !== $confirm_password) {
    http_response_code(400);
    echo json_encode(['error' => 'Passwords do not match.']);
    exit();
}

if (strlen($password) < 8) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid password, passwords should be at least 8 characters long']);
    exit();
} elseif (!preg_match('/[A-Z]/', $password)) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid password, passwords must contain at least one uppercase letter.']);
    exit();
} elseif (!preg_match('/[a-z]/', $password)) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid password, passwords must contain at least one lowercase letter.']);
    exit();
} elseif (!preg_match('/\d/', $password)) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid password, passwords must contain at least one number']);
    exit();
} elseif (!preg_match('/[!@#$%^&*_]/', $password)) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid password, passwords must contain at least one special character.']);
    exit();
}

$email = $_SESSION['reset_email'];
$hashed_password = password_hash($password, PASSWORD_DEFAULT);

// Update password in the database
$stmt = $pdo->prepare("UPDATE users SET password_hash = ? WHERE email = ?");

if ($stmt->execute([$hashed_password, $email])) {
    // Clear reset session variables
    session_unset();
    session_destroy();

    http_response_code(200);
    echo json_encode([
        'status' => 'success',
        'message' => 'Password has been updated successfully.'
    ]);
    exit();
} else {
    http_response_code(500);
    echo json_encode(['error' => 'Error updating password. Please try again.']);
    exit();
}