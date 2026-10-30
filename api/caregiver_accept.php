<?php

$inviteSecret = '1f77babcb8faff6367ed7d745a261b2ba756136cc258d8c8408e4cdc7065909f';

require __DIR__ . '/cors.php';
require __DIR__ . '/db.php';
require __DIR__ . '/require_auth.php';

header('Content-Type: application/json');

$userId = requireAuth();

if($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);

    echo json_encode([
        'success' => false,
        'error' => 'Method not allowed.'
    ]);

    exit;
}

$data = json_decode(file_get_contents('php://input'), true);

if(!is_array($data)) {
    http_response_code(400);

    echo json_encode([
        'success' => false,
        'error' => 'Invalid request data.'
    ]);

    exit;
}

$token = rawurldecode(trim($data['token'] ?? ''));

if($token === '') {
    http_response_code(400);

    echo json_encode([
        'success' => false,
        'error' => 'Invitation token is required.'
    ]);

    exit;
}

//Split the invitation token into the data and signature
$tokenParts = explode('.', $token, 2);

if(count($tokenParts) !== 2) {
    http_response_code(400);

    echo json_encode([
        'success' => false,
        'error' => 'Invalid invitation: format.'
    ]);

    exit;
}

$payload = $tokenParts[0];
$signature = $tokenParts[1];

//Create the signature that the token should have
$expectedSignature = hash_hmac(
    'sha256',
    $payload,
    $inviteSecret
);

//Make sure the invitation was not changed
if(!hash_equals($expectedSignature, $signature)) {
    http_response_code(400);

    echo json_encode([
        'success' => false,
        'error' => 'Invalid invitation: signature.'
    ]);

    exit;
}

//Decode the invitation information
$inviteData = json_decode(base64_decode($payload), true);

if(!is_array($inviteData)) {
    http_response_code(400);

    echo json_encode([
        'success' => false,
        'error' => 'Invalid invitation: payload.'
    ]);

    exit;
}

$patientId = $inviteData['patient_id'] ?? null;
$caregiverEmail = $inviteData['caregiver_email'] ?? '';
$expires = $inviteData['expires'] ?? 0;

if(
    $patientId === null ||
    filter_var($patientId, FILTER_VALIDATE_INT) === false ||
    (int)$patientId <= 0 ||
    $caregiverEmail === '' ||
    !is_numeric($expires)
) {
    http_response_code(400);

    echo json_encode([
        'success' => false,
        'error' => 'Invalid invitation.'
    ]);

    exit;
}

//Make sure the invitation has not expired
if($expires < time()) {
    http_response_code(400);

    echo json_encode([
        'success' => false,
        'error' => 'Invitation has expired.'
    ]);

    exit;
}

//Get the logged-in user's email
$stmt = $pdo->prepare(
    'SELECT email, isCaregiver, patientEmail FROM users WHERE id = ?'
);

$stmt->execute([$userId]);

$user = $stmt->fetch();

if(!$user) {
    http_response_code(404);

    echo json_encode([
        'success' => false,
        'error' => 'User account not found.'
    ]);

    exit;
}

//Make sure the patient is not accepting their own caregiver invitation
if((int)$patientId === (int)$userId) {
    http_response_code(400);

    echo json_encode([
        'success' => false,
        'error' => 'You cannot be your own caregiver.'
    ]);

    exit;
}

$loggedInEmail = $user['email'];

//Make sure the logged-in user is the caregiver who was invited
if(strtolower($loggedInEmail) !== strtolower($caregiverEmail)) {
    http_response_code(403);

    echo json_encode([
        'success' => false,
        'error' => 'This invitation belongs to a different account.'
    ]);

    exit;
}

//Make sure the caregiver relationship still exists
$stmt = $pdo->prepare(
    'SELECT cid
     FROM caregivers
     WHERE uid = ? AND email = ?'
);

$stmt->execute([
    (int) $patientId,
    $caregiverEmail
]);

if(!$stmt->fetch()) {
    http_response_code(404);

    echo json_encode([
        'success' => false,
        'error' => 'Caregiver invitation not found.'
    ]);

    exit;
}

//Get the patient's email
$stmt = $pdo->prepare(
    'SELECT email FROM users WHERE id = ?'
);

$stmt->execute([(int) $patientId]);

$patient = $stmt->fetch();

if(!$patient) {
    http_response_code(404);

    echo json_encode([
        'success' => false,
        'error' => 'Patient account not found.'
    ]);

    exit;
}

$patientEmail = $patient['email'];

//Make sure the caregiver is not already linked to a different patient
if(
    (int)$user['isCaregiver'] === 1 &&
    $user['patientEmail'] !== null &&
    strtolower($user['patientEmail']) !== strtolower($patientEmail)
) {
    http_response_code(409);

    echo json_encode([
        'success' => false,
        'error' => 'This account is already linked to another patient.'
    ]);

    exit;
}

//Link the caregiver account to the patient
$stmt = $pdo->prepare(
    'UPDATE users
     SET isCaregiver = 1, patientEmail = ?
     WHERE id = ?'
);

$stmt->execute([
    $patientEmail,
    $userId
]);

http_response_code(200);

echo json_encode([
    'success' => true,
    'message' => 'Caregiver invitation accepted successfully.'
]);

exit;