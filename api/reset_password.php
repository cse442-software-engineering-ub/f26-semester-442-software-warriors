<?php
ini_set('display_errors', 1);
error_reporting(E_ALL);
require __DIR__ . '/cors.php';
require __DIR__ . '/db.php';
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
$confirm_password = $_POST['confirm_password'] ?? '';

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

$email = $_SESSION['reset_email'];
$hashed_password = password_hash($password, PASSWORD_DEFAULT);

// Update password in the database
$stmt = $pdo->prepare("UPDATE users SET password = ? WHERE email = ?");
$stmt->bind_param("ss", $hashed_password, $email);

if ($stmt->execute()) {
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