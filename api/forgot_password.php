<?php
require __DIR__ . '/cors.php';
require __DIR__ . '/db.php';

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
  http_response_code(405);
  echo json_encode(['error' => 'Method not allowed. Use POST.']);
  exit;
}
else { //form submit handling
  //$raw  = file_get_contents('php://input');
  //$email = json_decode($raw, true);

  $email = $_POST['email'];

  //Checks for email existing in db
  $stmt = $conn->prepare("SELECT id FROM users WHERE email = ?");
  $stmt->bind_param("s", $email);
  $stmt->execute();
  $result = $stmt->get_result();

  if ($result->num_rows > 0) {
    //Generate OTP code
    $otp = rand(100000, 999999);
    $_SESSION['reset_otp'] = $otp;
    $_SESSION['reset_email'] = $email;
    $_SESSION['otp_time'] = time();

    //mailing logic goes here
  }
}