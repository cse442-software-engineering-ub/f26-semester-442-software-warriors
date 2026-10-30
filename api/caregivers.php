<?php

require __DIR__ . '/cors.php';
require __DIR__ . '/db.php';
require __DIR__ . '/require_auth.php';

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

require_once __DIR__ . '/PHPMailer/PHPMailer/src/Exception.php';
require_once __DIR__ . '/PHPMailer/PHPMailer/src/PHPMailer.php';
require_once __DIR__ . '/PHPMailer/PHPMailer/src/SMTP.php';

header('Content-Type: application/json');

//Returns an error response whenever a caregiver request fails
function caregiverFail(int $status, string $message): void
{
    http_response_code($status);

    echo json_encode([
        'success' => false,
        'error' => $message
        ]);
    exit;
}

//Get the logged-in user's ID from their session
$userId = requireAuth();

//Get the request method being used
$method = $_SERVER['REQUEST_METHOD'];

//Handle GET requests
if($method === 'GET') {

    //Get only caregivers belonging to the logged-in user
    $stmt = $pdo->prepare(
        'SELECT cid, name, email, phone_number
         FROM caregivers
         WHERE uid = ?
         ORDER BY name ASC'
    );

    $stmt->execute([$userId]);

    $caregivers = $stmt->fetchAll();

    //Make sure caregiver IDs are returned as whole numbers
    foreach($caregivers as &$caregiver) {
        $caregiver['cid'] = (int) $caregiver['cid'];
    }

    unset($caregiver);

    echo json_encode([
        'success' => true,
        'caregivers' => $caregivers
    ]);

    exit;
}

//handle POST requests
if($method === 'POST') {
    $name = trim($_POST['name'] ?? '');
    $email = trim($_POST['email'] ?? '');
    $phoneNumber = trim($_POST['phone_number'] ?? '');

    //make sure all required fields are provided
    if($name === ''){
        caregiverFail(400, 'Name is required');
    }

    if($email === ''){
        caregiverFail(400, 'Email is required');
    }

    if($phoneNumber === ''){
        caregiverFail(400, 'Phone number is required');
    }

    if(strlen($name) > 100) {
        caregiverFail(400, 'Name is too long');
    }

    if(filter_var($email, FILTER_VALIDATE_EMAIL) === false){
        caregiverFail(400, 'A valid email is required');
    }

    if(strlen($email) > 150) {
        caregiverFail(400, 'Email is too long');
    }

    if(!preg_match('/^[0-9]{10}$/', $phoneNumber)) {
        caregiverFail(400, 'A valid phone number is required');
    }

    //Get the logged-in patient's email
    $stmt = $pdo->prepare(
        'SELECT email FROM users WHERE id = ?'
    );

    $stmt->execute([$userId]);

    $patient = $stmt->fetch();

    if(!$patient) {
        caregiverFail(404, 'Patient account not found');
    }

    $patientEmail = $patient['email'];

    //Create caregiver invitation that expires in 24 hours
    $inviteData = [
        'patient_id' => $userId,
        'caregiver_email' => $email,
        'expires' => time() + 86400
    ];

    $payload = base64_encode(json_encode($inviteData));

    $inviteSecret = '1f77babcb8faff6367ed7d745a261b2ba756136cc258d8c8408e4cdc7065909f';

    $signature = hash_hmac(
        'sha256',
        $payload,
        $inviteSecret
    );

    $inviteToken = $payload . '.' . $signature;

    //Add the caregiver to the database for the currently logged in user
    $stmt = $pdo->prepare(
        'INSERT INTO caregivers (uid, name, email, phone_number)
         VALUES (?, ?, ?, ?)'
    );

    $stmt->execute([$userId, $name, $email, $phoneNumber]);

    $cid = (int) $pdo->lastInsertId();

    $createAccountLink =
    'https://aptitude.cse.buffalo.edu/CSE442/2026-Fall/cse-442ab/#/register';

    $acceptInviteLink =
        'https://aptitude.cse.buffalo.edu/CSE442/2026-Fall/cse-442ab/#/caregiver-invite?token=' . urlencode($inviteToken);

    $mail = new PHPMailer(true);

    try {

        $mail->isSMTP();
        $mail->SMTPAuth = true;
        $mail->SMTPSecure = 'ssl';
        $mail->Host = 'smtp.gmail.com';
        $mail->Port = 465;

        $mail->Username = '442.warriors@gmail.com';
        $mail->Password = 'YOUR_GMAIL_APP_PASSWORD';

        $mail->addAddress($email, $name);

        $mail->setFrom(
            '442.warriors@gmail.com',
            'VITALS, 442 Warriors'
        );

        $mail->Subject = 'VITALS Caregiver Invitation';

        $mail->isHTML(true);

        $mail->Body =
            "You have been invited to become a caregiver on VITALS.<br><br>" .
            "If you do not have an account, create one here:<br>" .
            "<a href=\"$createAccountLink\">Create Account</a><br><br>" .
            "After logging in, return to this email and accept the invitation:<br>" .
            "<a href=\"$acceptInviteLink\">Accept Caregiver Invitation</a><br><br>" .
            "This invitation expires in 24 hours.";

        $mail->send();

    }
    catch(Exception $e) {

        //Remove the caregiver because the invitation could not be sent
        $stmt = $pdo->prepare(
            'DELETE FROM caregivers WHERE cid = ? AND uid = ?'
        );

        $stmt->execute([
            $cid,
            $userId
        ]);

        caregiverFail(
            500,
            'Caregiver could not be added because the invitation email could not be sent'
        );
    }

    http_response_code(201);

    echo json_encode([
        
        'success' => true,
        'cid' => $cid,
        'message' => 'Caregiver added successfully'
    ]);

    exit;
}

//handle PUT requests
if($method === 'PUT') {
    $data = json_decode(file_get_contents('php://input'), true);

    if(!is_array($data)) {
        caregiverFail(400, 'Invalid request data.');
    }

    $cid = $data['cid'] ?? null;
    $name = trim($data['name'] ?? '');
    $email = trim($data['email'] ?? '');
    $phoneNumber = trim($data['phone_number'] ?? '');

    //make sure there is a caregiver ID
    if($cid === null || filter_var($cid, FILTER_VALIDATE_INT) === false || (int)$cid <= 0) {
        caregiverFail(400, 'Valid caregiver ID is required.');
    }

    //make sure all required fields are provided
    if($name === ''){
        caregiverFail(400, 'Name is required');
    }

    if($email === ''){
        caregiverFail(400, 'Email is required');
    }

    if($phoneNumber === ''){
        caregiverFail(400, 'Phone number is required');
    }

    if(strlen($name) > 100) {
        caregiverFail(400, 'Name is too long');
    }

    //valid email
    if(filter_var($email, FILTER_VALIDATE_EMAIL) === false){
        caregiverFail(400, 'A valid email is required');
    }

    if(strlen($email) > 150) {
        caregiverFail(400, 'Email is too long');
    }

    //valid phone number only digits
    if(!preg_match('/^[0-9]{10}$/', $phoneNumber)) {
        caregiverFail(400, 'A valid phone number is required');
    }

    //make sure the caregiver exists and is associated with the logged in user
    $stmt = $pdo->prepare(
        'SELECT cid FROM caregivers WHERE cid = ? AND uid = ?'
    );

    $stmt->execute([(int) $cid, $userId]);

    if(!$stmt->fetch()) {
        caregiverFail(404, 'Caregiver not found.');
    }

    //update the caregiver information
    $stmt = $pdo->prepare(
        'UPDATE caregivers
         SET name = ?, email = ?, phone_number = ?
         WHERE cid = ? AND uid = ?'
    );

    $stmt->execute([$name, $email, $phoneNumber, (int) $cid, $userId]);

    echo json_encode([
        'success' => true,
        'message' => 'Caregiver updated successfully.'
    ]);

    exit;
}

header('Allow: GET, POST, PUT');
caregiverFail(405, 'Method not allowed.');