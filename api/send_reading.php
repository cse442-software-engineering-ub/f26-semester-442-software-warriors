<?php

require_once __DIR__ . '/cors.php';
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/session_setup.php';
require_once __DIR__ . '/require_auth.php';

$config = require __DIR__ . '/mail_config.php';

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

require_once __DIR__ . '/PHPMailer/PHPMailer/src/Exception.php';
require_once __DIR__ . '/PHPMailer/PHPMailer/src/PHPMailer.php';
require_once __DIR__ . '/PHPMailer/PHPMailer/src/SMTP.php';

header('Content-Type: application/json');

//Return an error response
function notifyFail(int $status, string $message): void
{
    http_response_code($status);

    echo json_encode([
        'success' => false,
        'error' => $message
    ]);

    exit;
}

//Only POST requests are allowed
if($_SERVER['REQUEST_METHOD'] !== 'POST') {
    header('Allow: POST');
    notifyFail(405, 'Method not allowed. Use POST.');
}

//Make sure the user is logged in
$userId = requireAuth();

//Read the raw JSON request body
$rawBody = file_get_contents('php://input');

//If the body is completely empty, allow the normal
//missing reading ID check below to handle it
if(trim($rawBody) === '') {
    $data = [];
}
else {
    $data = json_decode($rawBody, true);

    //The request contained data, but it was not valid JSON
    if(json_last_error() !== JSON_ERROR_NONE || !is_array($data)) {
        notifyFail(400, 'Invalid request data.');
    }
}

//Get the reading and caregiver IDs
$readingId = $data['reading_id'] ?? null;
$cid = $data['cid'] ?? null;

//Make sure a valid reading ID was provided
if($readingId === null || filter_var($readingId, FILTER_VALIDATE_INT) === false || (int)$readingId <= 0) {
    notifyFail(400, 'Reading ID is required.');
}

//Make sure a valid caregiver ID was provided
if($cid === null || filter_var($cid, FILTER_VALIDATE_INT) === false || (int)$cid <= 0) {
    notifyFail(400, 'Caregiver ID is required.');
}

//Convert IDs to integers
$readingId = (int)$readingId;
$cid = (int)$cid;

//Get the selected blood pressure reading
//The uid check makes sure the reading belongs
//to the currently logged-in patient
$stmt = $pdo->prepare(
    'SELECT rid,
            systolic,
            diastolic,
            pulse,
            status,
            recorded_at
     FROM readings
     WHERE rid = ?
     AND uid = ?
     LIMIT 1'
);

$stmt->execute([$readingId, $userId]);
$reading = $stmt->fetch();

//This covers both a nonexistent reading
//and a reading belonging to another patient
if(!$reading) {
    notifyFail(404, 'Reading not found.');
}

//Get the selected accepted caregiver
//Only accepted caregivers exist in this table
$stmt = $pdo->prepare(
    'SELECT cid,
            name,
            email
     FROM caregivers
     WHERE cid = ?
     AND uid = ?
     LIMIT 1'
);

$stmt->execute([$cid, $userId]);
$caregiver = $stmt->fetch();

//This covers both a nonexistent caregiver
//and a caregiver belonging to another patient
if(!$caregiver) {
    notifyFail(404, 'Caregiver not found.');
}

//Get the logged-in patient's name
$stmt = $pdo->prepare(
    'SELECT name
     FROM users
     WHERE id = ?
     LIMIT 1'
);

$stmt->execute([$userId]);
$patient = $stmt->fetch();

//The logged-in user should always exist,
//but stop if their account cannot be found
if(!$patient) {
    notifyFail(404, 'Patient account not found.');
}

//Patient information
$patientName = $patient['name'];

//Caregiver information
$caregiverName = $caregiver['name'];
$caregiverEmail = $caregiver['email'];

//Reading information
$systolic = (int)$reading['systolic'];
$diastolic = (int)$reading['diastolic'];

//Some older readings may not have a pulse value
$pulse = $reading['pulse'] !== null ? (int)$reading['pulse'] : null;

$status = $reading['status'];
$recordedAt = $reading['recorded_at'];

//Display a readable pulse value
$pulseText = $pulse !== null ? $pulse . ' bpm' : 'Not recorded';

//Format the date and time for the email
$readingTimestamp = strtotime($recordedAt);
if($readingTimestamp !== false) {
    $displayDate = date('F j, Y', $readingTimestamp);
    $displayTime = date('g:i A', $readingTimestamp);
}
else {
    $displayDate = $recordedAt;
    $displayTime = '';
}

//Escape text before placing it inside HTML
$safePatientName = htmlspecialchars($patientName, ENT_QUOTES, 'UTF-8');
$safeCaregiverName = htmlspecialchars($caregiverName, ENT_QUOTES, 'UTF-8');
$safeStatus = htmlspecialchars($status, ENT_QUOTES, 'UTF-8');
$safeDate = htmlspecialchars($displayDate, ENT_QUOTES, 'UTF-8');
$safeTime = htmlspecialchars($displayTime, ENT_QUOTES, 'UTF-8');
$safePulseText = htmlspecialchars($pulseText, ENT_QUOTES, 'UTF-8');


//Create and send the caregiver email
try {
    $mail = new PHPMailer(true);
    $mail->isSMTP();
    $mail->SMTPAuth = true;

    //Load the existing email configuration
    $mail->Host = $config['host'];
    $mail->Username = $config['username'];
    $mail->Password = $config['password'];

    $mail->SMTPSecure = PHPMailer::ENCRYPTION_SMTPS;
    $mail->Port = 465;

    //Set the sender
    $mail->setFrom($config['username'], 'VITALS, 442 Warriors');

    //Send only to the caregiver chosen by the patient
    $mail->addAddress($caregiverEmail, $caregiverName);

    //Email subject
    $mail->Subject = 'VITALS Blood Pressure Reading';

    //HTML email
    $mail->isHTML(true);

    $mail->Body =
        "Hello $safeCaregiverName,<br><br>" .

        "$safePatientName shared a blood pressure reading with you on VITALS.<br><br>" .

        "<strong>Systolic:</strong> $systolic mmHg<br>" .
        "<strong>Diastolic:</strong> $diastolic mmHg<br>" .
        "<strong>Pulse Rate:</strong> $safePulseText<br>" .
        "<strong>Status:</strong> $safeStatus<br>" .
        "<strong>Date:</strong> $safeDate<br>" .
        "<strong>Time:</strong> $safeTime<br><br>" .
        "This message was sent through VITALS.";

    //Plain-text version of the same email
    $mail->AltBody =
        "Hello $caregiverName,\n\n" .

        "$patientName shared a blood pressure reading with you on VITALS.\n\n" .

        "Systolic: $systolic mmHg\n" .
        "Diastolic: $diastolic mmHg\n" .
        "Pulse Rate: $pulseText\n" .
        "Status: $status\n" .
        "Date: $displayDate\n" .
        "Time: $displayTime\n\n" .
        "This message was sent through VITALS.";

    //Actually send the email
    $mail->send();
}
catch(Throwable $e) {
    //Do not report success if PHPMailer fails
    notifyFail(500, 'Reading could not be sent.');
}

//Only return success after the email has been sent
http_response_code(200);
echo json_encode([
    'success' => true,
    'message' => 'Reading sent successfully.'
]);

exit;