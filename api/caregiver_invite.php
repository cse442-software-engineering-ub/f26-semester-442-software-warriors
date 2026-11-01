<?php

require __DIR__ . '/cors.php';
require __DIR__ . '/db.php';

header('Content-Type: application/json');

ini_set('session.use_cookies', '1');

session_set_cookie_params([
    'secure' => true,
    'httponly' => true,
    'samesite' => 'None',
]);

session_start();

//Build URLs based on where the backend is currently deployed
$scheme = (
    !empty($_SERVER['HTTPS']) &&
    $_SERVER['HTTPS'] !== 'off'
) ? 'https' : 'http';

$host = $_SERVER['HTTP_HOST'];

//caregiver_invite.php is inside /api,
//so go up one folder to get the frontend location
$frontendPath = dirname(dirname($_SERVER['SCRIPT_NAME']));

$frontendBase = $scheme . '://' . $host . $frontendPath;

//The invitation link should use GET
if($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);

    echo json_encode([
        'success' => false,
        'error' => 'Method not allowed.'
    ]);

    exit;
}

//Get token from invitation link
$token = trim($_GET['token'] ?? '');

if($token === '') {
    http_response_code(400);

    echo json_encode([
        'success' => false,
        'error' => 'Invitation token is required.'
    ]);

    exit;
}

//Hash the token so it can be compared with the database
$tokenHash = hash('sha256', $token);

//Find the invitation
$stmt = $pdo->prepare(
    'SELECT iid, patient_uid, name, email, phone_number, expires_at, used
     FROM caregiver_invitations
     WHERE token_hash = ?
     LIMIT 1'
);

$stmt->execute([$tokenHash]);

$invitation = $stmt->fetch();

if(!$invitation) {
    http_response_code(400);

    echo json_encode([
        'success' => false,
        'error' => 'Invalid invitation.'
    ]);

    exit;
}

//Make sure the invitation has not already been used
if((int)$invitation['used'] === 1) {
    http_response_code(400);

    echo json_encode([
        'success' => false,
        'error' => 'This invitation has already been used.'
    ]);

    exit;
}

//Make sure the invitation has not expired
if(strtotime($invitation['expires_at']) <= time()) {
    http_response_code(400);

    echo json_encode([
        'success' => false,
        'error' => 'Invitation has expired.'
    ]);

    exit;
}

$invitationId = (int)$invitation['iid'];
$patientId = (int)$invitation['patient_uid'];
$caregiverEmail = $invitation['email'];

//Save the invitation in the PHP session
$_SESSION['caregiver_invite_iid'] = $invitationId;
$_SESSION['caregiver_invite_email'] = $caregiverEmail;

//Check whether the caregiver already has a VITALS account
$stmt = $pdo->prepare(
    'SELECT id, email
     FROM users
     WHERE LOWER(email) = LOWER(?)
     LIMIT 1'
);

$stmt->execute([$caregiverEmail]);

$caregiverAccount = $stmt->fetch();

//No account exists yet, so send them to registration
if(!$caregiverAccount) {
    header(
        'Location: ' . $frontendBase . '/#/register'
    );

    exit;
}

$caregiverUserId = (int)$caregiverAccount['id'];

//The caregiver has an account but is not logged in
if(!isset($_SESSION['user_id'])) {
    header(
        'Location: ' . $frontendBase . '/#/login'
    );

    exit;
}

//If the wrong account is currently logged in,
//log it out and make the invited caregiver log in
if((int)$_SESSION['user_id'] !== $caregiverUserId) {

    unset($_SESSION['user_id']);

    header(
        'Location: ' . $frontendBase . '/#/login'
    );

    exit;
}

//The correct caregiver is already logged in.
//Check that the relationship does not already exist.
$stmt = $pdo->prepare(
    'SELECT cid
     FROM caregivers
     WHERE uid = ?
     AND caregiver_uid = ?
     LIMIT 1'
);

$stmt->execute([
    $patientId,
    $caregiverUserId
]);

if($stmt->fetch()) {
    http_response_code(409);

    echo json_encode([
        'success' => false,
        'error' => 'This caregiver has already been added.'
    ]);

    exit;
}

try {

    $pdo->beginTransaction();

    //Create the accepted caregiver relationship
    $stmt = $pdo->prepare(
        'INSERT INTO caregivers
         (uid, name, email, phone_number, caregiver_uid)
         VALUES (?, ?, ?, ?, ?)'
    );

    $stmt->execute([
        $patientId,
        $invitation['name'],
        $caregiverEmail,
        $invitation['phone_number'],
        $caregiverUserId
    ]);

    //Mark the user's account as a caregiver
    $stmt = $pdo->prepare(
        'UPDATE users
         SET isCaregiver = 1
         WHERE id = ?'
    );

    $stmt->execute([
        $caregiverUserId
    ]);

    //Mark the invitation as used
    $stmt = $pdo->prepare(
        'UPDATE caregiver_invitations
         SET used = 1
         WHERE iid = ?'
    );

    $stmt->execute([
        $invitationId
    ]);

    $pdo->commit();
}
catch(Throwable $e) {

    if($pdo->inTransaction()) {
        $pdo->rollBack();
    }

    http_response_code(500);

    echo json_encode([
        'success' => false,
        'error' => 'Caregiver invitation could not be accepted.'
    ]);

    exit;
}

//Clear invitation information from the session
unset($_SESSION['caregiver_invite_iid']);
unset($_SESSION['caregiver_invite_email']);

echo json_encode([
    'success' => true,
    'message' => 'Caregiver invitation accepted successfully.'
]);

exit;