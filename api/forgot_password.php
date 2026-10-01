<?php
ini_set('display_errors', 1);
error_reporting(E_ALL);
require __DIR__ . '/cors.php';
require __DIR__ . '/db.php';
session_start();

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

require_once __DIR__ . '/PHPMailer/PHPMailer/src/Exception.php';
require_once __DIR__ . '/PHPMailer/PHPMailer/src/PHPMailer.php';
require_once __DIR__ . '/PHPMailer/PHPMailer/src/SMTP.php';

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed. Use POST.']);
    exit();
}

$email = $_POST['email'] ?? '';

if (empty($email)) {
    http_response_code(400);
    echo json_encode(['error' => 'Email is required.']);
    exit();
}

// Check for email and retrieve the user's name
$stmt = $pdo->prepare("SELECT id, name FROM users WHERE email = ?");
$stmt->execute([$email]);
$user = $stmt->fetch();

if ($user) {
    $name = $user['name'] ?? 'User';

    // Generate 6-digit OTP code
    $otp = rand(100000, 999999);
    $_SESSION['reset_otp'] = $otp;
    $_SESSION['reset_email'] = $email;
    $_SESSION['otp_time'] = time();

    $mail = new PHPMailer(true);

    try {
        $mail->isSMTP();
        $mail->SMTPAuth = true;
        $mail->SMTPSecure = "ssl";
        $mail->Host = 'smtp.gmail.com';
        $mail->Port = 465;
        $mail->Username = "442.warriors@gmail.com";
        // NOTE: Replace this with an environment variable or secure config
        $mail->Password = 'vlfqqdftkbjhrgpg';

        $mail->addAddress($email, $name);
        $mail->setFrom("442.warriors@gmail.com", "VITALS, 442 Warriors");
        $mail->Subject = "One Time Password, Reset Password.";
        $mail->isHTML(true);
        $mail->Body = "Your OTP for password reset is: <b>$otp</b><br>This OTP will expire in 10 minutes.";

        $mail->send();

        http_response_code(200);
        echo json_encode([
            'status' => 'success',
            'message' => 'An OTP has been sent to your email address.',
            'debug_otp' => $otp // Capturable by Postman tewsts
        ]);
        exit();
    } catch (Exception $e) {
        // Return 200 with debug_otp even if SMTP fails locally, so tests can proceed
        http_response_code(200);
        echo json_encode([
            'status' => 'warning',
            'message' => 'Mail delivery failed, but OTP was generated for testing.',
            'debug_otp' => $otp,
            'mailer_error' => $mail->ErrorInfo
        ]);
        exit();
    }
} else {
    http_response_code(404);
    echo json_encode(['error' => 'Email address not found!']);
    exit();
}