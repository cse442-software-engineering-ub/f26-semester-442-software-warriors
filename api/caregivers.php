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

    //Get accepted caregivers belonging to the logged-in patient
    $stmt = $pdo->prepare(
        'SELECT cid, name, email, phone_number
         FROM caregivers
         WHERE uid = ?
         ORDER BY name ASC'
    );

    $stmt->execute([$userId]);

    $caregivers = $stmt->fetchAll();

    //Mark each accepted caregiver as accepted
    foreach($caregivers as &$caregiver) {

        $caregiver['cid'] = (int)$caregiver['cid'];

        $caregiver['iid'] = null;

        $caregiver['status'] = 'accepted';
    }

    unset($caregiver);

    //Get active pending caregiver invitations
    $stmt = $pdo->prepare(
        'SELECT iid, name, email, phone_number
         FROM caregiver_invitations
         WHERE patient_uid = ?
         AND used = 0
         AND expires_at > NOW()
         ORDER BY name ASC'
    );

    $stmt->execute([$userId]);

    $pendingInvitations = $stmt->fetchAll();

    //Format pending invitations like caregiver records
    foreach($pendingInvitations as &$invitation) {

        $invitation['iid'] = (int)$invitation['iid'];

        $invitation['cid'] = null;

        $invitation['status'] = 'pending';
    }

    unset($invitation);

    //Get expired caregiver invitations
    $stmt = $pdo->prepare(
        'SELECT iid, name, email, phone_number
        FROM caregiver_invitations
        WHERE patient_uid = ?
        AND used = 0
        AND expires_at <= NOW()
        ORDER BY name ASC'
    );

    $stmt->execute([$userId]);

    $rejectedInvitations = $stmt->fetchAll();

    //Mark expired invitations as rejected
    foreach($rejectedInvitations as &$invitation) {

        $invitation['iid'] = (int)$invitation['iid'];

        $invitation['cid'] = null;

        $invitation['status'] = 'rejected';
    }

    unset($invitation);

    //Combine accepted caregivers and pending invitations
    $allCaregivers = array_merge(
        $caregivers,
        $pendingInvitations,
        $rejectedInvitations
    );

    echo json_encode([
        'success' => true,
        'caregivers' => $allCaregivers
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

    //Create a random invitation token
    $inviteToken = bin2hex(random_bytes(32));

    //Only store a hash of the token in the database
    $tokenHash = hash('sha256', $inviteToken);

    //Check for an existing invitation for this patient and email
    $stmt = $pdo->prepare(
        'SELECT iid, expires_at, used
        FROM caregiver_invitations
        WHERE patient_uid = ?
        AND LOWER(email) = LOWER(?)
        ORDER BY iid DESC
        LIMIT 1'
    );

    $stmt->execute([
        $userId,
        $email
    ]);

    $existingInvitation = $stmt->fetch();

    //If there is already an active invitation, do not send another one
    if(
        $existingInvitation &&
        (int)$existingInvitation['used'] === 0 &&
        strtotime($existingInvitation['expires_at']) > time()
    ) {
        caregiverFail(
            409,
            'An active invitation already exists for this caregiver.'
        );
    }

    try {

        $pdo->beginTransaction();

        //If an old invitation exists, reuse and update that row
        if($existingInvitation) {

            $stmt = $pdo->prepare(
                'UPDATE caregiver_invitations
                SET name = ?,
                    email = ?,
                    phone_number = ?,
                    token_hash = ?,
                    expires_at = DATE_ADD(NOW(), INTERVAL 3 HOUR),
                    used = 0
                WHERE iid = ?
                AND patient_uid = ?'
            );

            $stmt->execute([
                $name,
                $email,
                $phoneNumber,
                $tokenHash,
                (int)$existingInvitation['iid'],
                $userId
            ]);

            $iid = (int)$existingInvitation['iid'];
        }

        //If no old invitation exists, create a brand new row
        else {

            $stmt = $pdo->prepare(
                'INSERT INTO caregiver_invitations
                (patient_uid, name, email, phone_number, token_hash, expires_at, used)
                VALUES (?, ?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL 3 HOUR), 0)'
            );

            $stmt->execute([
                $userId,
                $name,
                $email,
                $phoneNumber,
                $tokenHash
            ]);

            $iid = (int)$pdo->lastInsertId();
        }

        $inviteLink =
            $apiBase .
            '/caregiver_invite.php?token=' .
            urlencode($inviteToken);

        $mail = new PHPMailer(true);

        $mail->isSMTP();
        $mail->SMTPAuth = true;

        //load credentials from config file
        $mail->Host = $config['host'];
        $mail->Username = $config['username'];
        $mail->Password = $config['password'];

        $mail->SMTPSecure = PHPMailer::ENCRYPTION_SMTPS;
        $mail->Port = 465;

        $mail->addAddress($email, $name);

        $mail->setFrom(
            $config['username'],
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
            "This invitation expires in 3 hours.";

        $mail->send();

        $pdo->commit();
    }
    catch(Throwable $e) {

        if($pdo->inTransaction()) {
            $pdo->rollBack();
        }

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
    $iid = $data['iid'] ?? null;

    //At least one ID must be provided
    if($cid === null && $iid === null) {
        caregiverFail(
            400,
            'Valid caregiver ID is required.'
        );
    }

    //Do not allow both IDs at the same time
    if($cid !== null && $iid !== null) {
        caregiverFail(
            400,
            'Provide either a caregiver ID or invitation ID, not both.'
        );
    }


    //Delete a pending or rejected caregiver invitation
    if($iid !== null) {

        if(
            filter_var($iid, FILTER_VALIDATE_INT) === false ||
            (int)$iid <= 0
        ) {
            caregiverFail(
                400,
                'Valid invitation ID is required.'
            );
        }

        //Delete the invitation only if it belongs to the logged-in patient
        //and has not already been accepted
        $stmt = $pdo->prepare(
            'DELETE FROM caregiver_invitations
             WHERE iid = ?
             AND patient_uid = ?
             AND used = 0'
        );

        $stmt->execute([
            (int)$iid,
            $userId
        ]);

        //No matching pending or rejected invitation was found
        if($stmt->rowCount() === 0) {
            caregiverFail(
                404,
                'Invitation not found.'
            );
        }

        echo json_encode([
            'success' => true,
            'message' => 'Caregiver invitation deleted successfully.'
        ]);

        exit;
    }


    //Delete an accepted caregiver
    if(
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

        //Delete the patient-caregiver relationship
        $stmt = $pdo->prepare(
            'DELETE FROM caregivers
             WHERE cid = ?
             AND uid = ?'
        );

        $stmt->execute([
            (int)$cid,
            $userId
        ]);

        //remove their caregiver status after deleting the relationship
        if($caregiverUserId !== null) {

            $stmt = $pdo->prepare(
                'UPDATE users
                 SET isCaregiver = 0,
                     patientEmail = NULL
                 WHERE id = ?'
            );

            $stmt->execute([
                (int)$caregiverUserId
            ]);
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