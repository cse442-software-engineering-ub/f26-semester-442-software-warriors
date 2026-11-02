<?php

require __DIR__ . '/cors.php';
require __DIR__ . '/db.php';
require __DIR__ . '/require_auth.php';
$config = require __DIR__ . '/mail_config.php';


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

//Build the API URL based on where caregivers.php is currently deployed
//Use https when the server is using https, otherwise use http
$scheme = (
    !empty($_SERVER['HTTPS']) &&
    $_SERVER['HTTPS'] !== 'off'
) ? 'https' : 'http';

//Get the current website host
$host = $_SERVER['HTTP_HOST'];

//Get the folder that caregivers.php is currently inside
$apiPath = dirname($_SERVER['SCRIPT_NAME']);

//Create the full API base URL
$apiBase = $scheme . '://' . $host . $apiPath;

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
    if($name === '') {
        caregiverFail(400, 'Name is required');
    }

    if($email === '') {
        caregiverFail(400, 'Email is required');
    }

    if($phoneNumber === '') {
        caregiverFail(400, 'Phone number is required');
    }

    if(strlen($name) > 100) {
        caregiverFail(400, 'Name is too long');
    }

    if(filter_var($email, FILTER_VALIDATE_EMAIL) === false) {
        caregiverFail(400, 'A valid email is required');
    }

    if(strlen($email) > 150) {
        caregiverFail(400, 'Email is too long');
    }

    if(!preg_match('/^[0-9]{10}$/', $phoneNumber)) {
        caregiverFail(400, 'A valid phone number is required');
    }

    //Get the logged-in patient's information
    $stmt = $pdo->prepare(
        'SELECT name, email
         FROM users
         WHERE id = ?'
    );

    $stmt->execute([$userId]);

    $patient = $stmt->fetch();

    if(!$patient) {
        caregiverFail(404, 'Patient account not found');
    }

    $patientName = $patient['name'];
    $patientEmail = $patient['email'];

    //Do not allow the patient to invite themselves
    if(strtolower($patientEmail) === strtolower($email)) {
        caregiverFail(400, 'You cannot add yourself as a caregiver.');
    }

    //Check if this caregiver has already been accepted
    $stmt = $pdo->prepare(
        'SELECT cid
         FROM caregivers
         WHERE uid = ?
         AND LOWER(email) = LOWER(?)
         LIMIT 1'
    );

    $stmt->execute([
        $userId,
        $email
    ]);

    if($stmt->fetch()) {
        caregiverFail(
            409,
            'This caregiver has already been added.'
        );
    }

    //If this email already belongs to a user account,
    //also make sure that user is not already this patient's caregiver
    $stmt = $pdo->prepare(
        'SELECT id
         FROM users
         WHERE LOWER(email) = LOWER(?)
         LIMIT 1'
    );

    $stmt->execute([$email]);

    $caregiverAccount = $stmt->fetch();

    if($caregiverAccount) {
        $stmt = $pdo->prepare(
            'SELECT cid
             FROM caregivers
             WHERE uid = ?
             AND caregiver_uid = ?
             LIMIT 1'
        );

        $stmt->execute([
            $userId,
            (int)$caregiverAccount['id']
        ]);

        if($stmt->fetch()) {
            caregiverFail(
                409,
                'This caregiver has already been added.'
            );
        }
    }

    //Make sure there is not already an active invitation
    $stmt = $pdo->prepare(
        'SELECT iid
         FROM caregiver_invitations
         WHERE patient_uid = ?
         AND LOWER(email) = LOWER(?)
         AND used = 0
         AND expires_at > NOW()
         LIMIT 1'
    );

    $stmt->execute([
        $userId,
        $email
    ]);

    if($stmt->fetch()) {
        caregiverFail(
            409,
            'An active invitation already exists for this caregiver.'
        );
    }

    //Create a random invitation token
    $inviteToken = bin2hex(random_bytes(32));

    //Only store a hash of the token in the database
    $tokenHash = hash('sha256', $inviteToken);

    //Store the pending caregiver invitation
    $stmt = $pdo->prepare(
        'INSERT INTO caregiver_invitations
         (patient_uid, name, email, phone_number, token_hash, expires_at, used)
         VALUES (?, ?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL 24 HOUR), 0)'
    );

    $stmt->execute([
        $userId,
        $name,
        $email,
        $phoneNumber,
        $tokenHash
    ]);

    $iid = (int)$pdo->lastInsertId();

    $inviteLink = $apiBase . '/caregiver_invite.php?token=' . urlencode($inviteToken);

    $mail = new PHPMailer(true);

    try {
        $mail->isSMTP();
        $mail->SMTPAuth = true;
        $mail->SMTPSecure = 'ssl';
        $mail->Host = $config['host'];
        $mail->Port = 465;

        $mail->Username = $config['username'];
        $mail->Password = $config['password'];

        $mail->addAddress($email, $name);

        $mail->setFrom(
            '442.warriors@gmail.com',
            'VITALS, 442 Warriors'
        );

        $mail->Subject = 'VITALS Caregiver Invitation';
        $mail->isHTML(true);

        $safePatientName = htmlspecialchars(
            $patientName,
            ENT_QUOTES,
            'UTF-8'
        );

        $mail->Body =
            "$safePatientName has invited you to become their caregiver on VITALS.<br><br>" .
            "Click the link below to continue:<br>" .
            "<a href=\"$inviteLink\">Accept Caregiver Invitation</a><br><br>" .
            "If you already have a VITALS account, you will be asked to log in.<br>" .
            "If you do not have an account, you will be asked to create one.<br><br>" .
            "This invitation expires in 24 hours.";

        $mail->send();
    }
    catch(Exception $e) {

        //Remove the invitation if the email could not be sent
        $stmt = $pdo->prepare(
            'DELETE FROM caregiver_invitations
             WHERE iid = ? AND patient_uid = ?'
        );

        $stmt->execute([
            $iid,
            $userId
        ]);

        caregiverFail(
            500,
            'Caregiver invitation could not be sent.'
        );
    }

    http_response_code(201);

    echo json_encode([
        'success' => true,
        'iid' => $iid,
        'message' => 'Caregiver invitation sent successfully'
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

//handle DELETE requests
if($method === 'DELETE') {

    $data = json_decode(
        file_get_contents('php://input'),
        true
    );

    if(!is_array($data)) {
        caregiverFail(400, 'Invalid request data.');
    }

    $cid = $data['cid'] ?? null;

    //Make sure a valid caregiver record ID was provided
    if(
        $cid === null ||
        filter_var($cid, FILTER_VALIDATE_INT) === false ||
        (int)$cid <= 0
    ) {
        caregiverFail(
            400,
            'Valid caregiver ID is required.'
        );
    }

    //Make sure this caregiver belongs to the logged-in patient
    //and get the caregiver's actual users.id
    $stmt = $pdo->prepare(
        'SELECT caregiver_uid
         FROM caregivers
         WHERE cid = ?
         AND uid = ?
         LIMIT 1'
    );

    $stmt->execute([
        (int)$cid,
        $userId
    ]);

    $caregiver = $stmt->fetch();

    if(!$caregiver) {
        caregiverFail(
            404,
            'Caregiver not found.'
        );
    }

    $caregiverUserId = $caregiver['caregiver_uid'];

    try {

        $pdo->beginTransaction();

        //Delete this patient-caregiver relationship
        $stmt = $pdo->prepare(
            'DELETE FROM caregivers
             WHERE cid = ?
             AND uid = ?'
        );

        $stmt->execute([
            (int)$cid,
            $userId
        ]);

        //If this caregiver has a user account,
        //check whether they are still a caregiver for anyone else
        if($caregiverUserId !== null) {

            $caregiverUserId = (int)$caregiverUserId;

            $stmt = $pdo->prepare(
                'SELECT COUNT(*)
                 FROM caregivers
                 WHERE caregiver_uid = ?'
            );

            $stmt->execute([
                $caregiverUserId
            ]);

            $remainingRelationships =
                (int)$stmt->fetchColumn();

            //If they are no longer anyone's caregiver,
            //remove their caregiver status
            if($remainingRelationships === 0) {

                $stmt = $pdo->prepare(
                    'UPDATE users
                     SET isCaregiver = 0,
                         patientEmail = NULL
                     WHERE id = ?'
                );

                $stmt->execute([
                    $caregiverUserId
                ]);
            }
        }

        $pdo->commit();
    }
    catch(Throwable $e) {

        if($pdo->inTransaction()) {
            $pdo->rollBack();
        }

        caregiverFail(
            500,
            'Caregiver could not be deleted.'
        );
    }

    echo json_encode([
        'success' => true,
        'message' => 'Caregiver deleted successfully.'
    ]);

    exit;
}

header('Allow: GET, POST, PUT, DELETE');
caregiverFail(405, 'Method not allowed.');