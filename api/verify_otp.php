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

// Check for OTP and email in session
if (!isset($_SESSION['reset_otp']) || !isset($_SESSION['reset_email'])) {
    http_response_code(403);
    echo json_encode(['error' => 'No active OTP session found. Please request a new OTP.']);
    exit();
}

if ($_SERVER["REQUEST_METHOD"] !== "POST") {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed. Use POST.']);
    exit();
}

$entered_otp = $_POST['otp'] ?? '';
$stored_otp  = $_SESSION['reset_otp'];
$otp_time    = $_SESSION['otp_time'];

// Check OTP expiration (600 seconds == 10 minutes)
if (time() - $otp_time > 600) {
    unset($_SESSION['reset_otp'], $_SESSION['otp_time']);
    http_response_code(400);
    echo json_encode(['error' => 'OTP has expired. Please request a new one.']);
    exit();
}

// Compare entered OTP with stored OTP (cast to string to avoid type mismatches)
if ((string)$entered_otp === (string)$stored_otp) {
    $_SESSION['otp_verified'] = true;
    http_response_code(200);
    echo json_encode([
        'status' => 'success',
        'message' => 'OTP verified successfully. You may now reset your password.'
    ]);
    exit();
} else {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid OTP. Please try again.']);
    exit();
}