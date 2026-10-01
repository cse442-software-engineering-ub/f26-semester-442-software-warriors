<?php
require_once 'config.php';
header('Content-Type: application/json');
session_start();

// Check for OTP and email set in session
if (!isset($_SESSION['reset_otp']) || !isset($_SESSION['reset_email'])) {
    http_response_code(400);
    echo json_encode(['error' => 'OTP session not found. Please request a new OTP.']);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed. Use POST.']);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true);
$entered_otp = $input['otp'] ?? '';

if (empty($entered_otp)) {
    http_response_code(400);
    echo json_encode(['error' => 'OTP is required']);
    exit;
}

$stored_otp = $_SESSION['reset_otp'];
$otp_time = $_SESSION['otp_time'];

// Check OTP expiration (600 seconds = 10 minutes)
if (time() - $otp_time > 600) {
    unset($_SESSION['reset_otp']);
    unset($_SESSION['otp_time']);
    http_response_code(400);
    echo json_encode(['error' => 'OTP has expired. Please request a new one.']);
    exit;
}
else if ($entered_otp == $stored_otp) {
    $_SESSION['otp_verified'] = true;
    echo json_encode([
        'success' => true,
        'message' => 'OTP verified successfully. You can now set a new password.'
    ]);
} else {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid OTP. Please try again.']);
}
?>
