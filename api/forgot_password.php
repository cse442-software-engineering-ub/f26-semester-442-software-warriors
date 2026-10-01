<?php
require __DIR__ . '/cors.php';
require __DIR__ . '/db.php';
use PHPMailer\PHPMailer\src\PHPMailer;
use PHPMailer\PHPMailer\src\Exception;
require __DIR__ . '/PHPMailer/src/Exception.php';
require __DIR__ . '/PHPMailer/src/PHPMailer.php';
require __DIR__ . '/PHPMailer/src/SMTP.php';

header('Content-Type: application/json');
session_start(); // Make sure session is started

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
  http_response_code(405);
  echo json_encode(['error' => 'Method not allowed. Use POST.']);
  exit;
}

$input = json_decode(file_get_contents('php://input'), true);
$email = $input['email'] ?? '';

if (empty($email)) {
  http_response_code(400);
  echo json_encode(['error' => 'Email is required']);
  exit;
}

// Check for email existing in db
$stmt = $conn->prepare("SELECT id, name FROM users WHERE email = ?");
$stmt->bind_param("s", $email);
$stmt->execute();
$result = $stmt->get_result();

if ($result->num_rows > 0) {
  $user = $result->fetch_assoc();
  $name = $user['name'];

  // Generate OTP code
  $otp = rand(100000, 999999);
  $_SESSION['reset_otp'] = $otp;
  $_SESSION['reset_email'] = $email;
  $_SESSION['otp_time'] = time();

  // Mailing logic
  $mail = new PHPMailer(true);

  try {
    $mail->isSMTP();
    $mail->SMTPAuth = true;
    $mail->SMTPSecure = "ssl";
    $mail->Host = 'smtp.gmail.com';
    $mail->Port = 465;
    $mail->Username = "442.warriors@gmail.com";
    $mail->Password = "HGKr$ay^@1Amq8ny";

    $mail->addAddress($email, $name);
    $mail->setFrom("442.warriors@gmail.com", "VITALS, 442 Warriors");
    $mail->Subject = "One Time Password - Reset Password";
    $mail->isHTML(true);
    $mail->Body = "Your OTP for password reset is: <b>$otp</b><br>This OTP will expire in 10 minutes.";

    if ($mail->send()) {
      echo json_encode([
        'success' => true,
        'message' => 'An OTP has been sent to your email address.'
        'otp' => $otp
      ]);
    } else {
      http_response_code(500);
      echo json_encode(['error' => 'Message could not be sent.']);
    }
  } catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Message could not be sent.']);
  }
} else {
  http_response_code(404);
  echo json_encode(['error' => 'Email address not found!']);
}
?>
