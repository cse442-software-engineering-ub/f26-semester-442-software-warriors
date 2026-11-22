<?php
ini_set('display_errors', 0);
error_reporting(E_ALL);
require __DIR__ . '/cors.php';
require __DIR__ . '/db.php';
require __DIR__ . '/rate_limit.php';
$config = require __DIR__ . '/mail_config.php';
require __DIR__ . '/session_setup.php';

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
$email = is_string($email) ? trim($email) : '';

if ($email === '') {
    http_response_code(400);
    echo json_encode(['error' => 'Email is required.']);
    exit();
}

// A new request always starts over: forget any code that was already verified
unset($_SESSION['otp_verified'], $_SESSION['otp_verified_email']);

// 3 codes per email per hour, so nobody can flood someone's inbox or keep guessing new codes
if (tooManyAttempts($pdo, 'forgot_password', $email, 3, 60)) {
    http_response_code(429);
    echo json_encode(['status' => 'error', 'message' => 'Too many codes requested for this email. Try again in an hour.']);
    exit();
}
recordAttempt($pdo, 'forgot_password', $email);

// Same answer whether or not the email has an account, so this page can't be used to find out
// who uses VITALS
$sentMessage = 'If an account exists for that email, we sent it a code.';

// Check for email and retrieve the user's name
$stmt = $pdo->prepare("SELECT id, name FROM users WHERE email = ?");
$stmt->execute([$email]);
$user = $stmt->fetch();

if ($user) {
    $name = $user['name'] ?? 'User';

    // Generate 6-digit OTP code
    $otp = random_int(100000, 999999); // random_int is safe for codes; rand() can be predicted
    $_SESSION['reset_otp'] = $otp;
    $_SESSION['reset_email'] = $email;
    $_SESSION['otp_time'] = time();
    $_SESSION['otp_tries'] = 0; // a new code gets 5 new tries

    $mail = new PHPMailer(true);

    try {
        $mail->isSMTP();
        $mail->SMTPAuth = true;
        $mail->SMTPSecure = "ssl";
        $mail->Host = $config['host'];
        $mail->Port = 465;
        $mail->Username = $config['username'];
        $mail->Password = $config['password'];

        $mail->addAddress($email, $name);
        $mail->setFrom("442.warriors@gmail.com", "VITALS, 442 Warriors");
        $mail->Subject = "One Time Password, Reset Password.";
        $mail->isHTML(true);
        $mail->Body = "Your OTP for password reset is: <b>$otp</b><br>This OTP will expire in 10 minutes.";

        $mail->send();

        http_response_code(200);
        echo json_encode([
            'status' => 'success',
            'message' => $sentMessage,
            //'debug_otp' => $otp // Capturable by Postman tewsts AFTER TESTING COMPLETES THIS SHOULD BE DELETED
        ]);
        exit();
    } catch (Exception $e) {
        // Never send config, OTP or mailer details to the browser. Log them on the server only.
        error_log('forgot_password.php mail failed: ' . $mail->ErrorInfo);
        http_response_code(500);
        echo json_encode([
            'status' => 'error',
            'message' => 'We could not send the email right now. Please try again later.'
        ]);
        exit();
    }
} else {
    // No account: keep a code nobody receives, so the next steps fail the same way as a wrong code
    $_SESSION['reset_otp'] = random_int(100000, 999999);
    $_SESSION['reset_email'] = $email;
    $_SESSION['otp_time'] = time();
    $_SESSION['otp_tries'] = 0;
    http_response_code(200);
    echo json_encode(['status' => 'success', 'message' => $sentMessage]);
    exit();
}