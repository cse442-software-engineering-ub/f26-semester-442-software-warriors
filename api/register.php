<?php
require __DIR__ . '/cors.php';
require __DIR__ . '/db.php';

header('Content-Type: application/json');

//Start session so caregiver invitation information can carry over
ini_set('session.use_cookies', '1');

session_set_cookie_params([
    'secure' => true,
    'httponly' => true,
    'samesite' => 'None',
]);

session_start();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
  http_response_code(405);
  echo json_encode(['error' => 'Method not allowed. Use POST.']);
  exit;
}

$raw  = file_get_contents('php://input');
$data = json_decode($raw, true);

$name     = trim($data['name']     ?? '');
$email    = trim($data['email']    ?? '');
$phone    = trim($data['phone']    ?? '');
$password = $data['password']      ?? '';

$errors = [];

if ($name === '') {
  $errors['name'] = 'Name is required.';
}

if ($email === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
  $errors['email'] = 'A valid email is required.';
}

if ($phone === '' || !preg_match('/^\d{7,15}$/', $phone)) {
  $errors['phone'] = 'A valid phone number (digits only, 7-15 characters) is required.';
}

if (strlen($password) < 8) {
  $errors['password'] = 'Password must be at least 8 characters.';
} 

elseif (!preg_match('/[A-Z]/', $password)) {
  $errors['password'] = 'Password must contain at least one uppercase letter.';
} 

elseif (!preg_match('/[a-z]/', $password)) {
  $errors['password'] = 'Password must contain at least one lowercase letter.';
} 

elseif (!preg_match('/\d/', $password)) {
  $errors['password'] = 'Password must contain at least one number.';
} 

elseif (!preg_match('/[!@#$%^&*_]/', $password)) {
  $errors['password'] = 'Password must contain at least one special character.';
}

if (!empty($errors)) {
  http_response_code(422);
  echo json_encode(['errors' => $errors]);
  exit;
}

//If registration came from a caregiver invitation,
//validate the invitation before creating the account
$invitation = null;
$invitationId = null;

if(isset($_SESSION['caregiver_invite_iid'])) {

    $invitationId = (int)$_SESSION['caregiver_invite_iid'];

    $stmt = $pdo->prepare(
        'SELECT iid, patient_uid, name, email, phone_number, expires_at, used
         FROM caregiver_invitations
         WHERE iid = ?
         LIMIT 1'
    );

    $stmt->execute([
        $invitationId
    ]);

    $invitation = $stmt->fetch();

    if(!$invitation) {

        unset($_SESSION['caregiver_invite_iid']);
        unset($_SESSION['caregiver_invite_email']);

        http_response_code(400);

        echo json_encode([
            'error' => 'Invalid invitation.'
        ]);

        exit;
    }

    if((int)$invitation['used'] === 1) {

        unset($_SESSION['caregiver_invite_iid']);
        unset($_SESSION['caregiver_invite_email']);

        http_response_code(400);

        echo json_encode([
            'error' => 'This invitation has already been used.'
        ]);

        exit;
    }

    if(strtotime($invitation['expires_at']) <= time()) {

        unset($_SESSION['caregiver_invite_iid']);
        unset($_SESSION['caregiver_invite_email']);

        http_response_code(400);

        echo json_encode([
            'error' => 'Invitation has expired.'
        ]);

        exit;
    }

    //Must register using the email that received the invitation
    if(
        strtolower($email) !==
        strtolower($invitation['email'])
    ) {

        http_response_code(403);

        echo json_encode([
            'error' =>
                'You must register using the email that was invited.'
        ]);

        exit;
    }
}


$stmt = $pdo->prepare('SELECT id FROM users WHERE email = ? OR phone = ?');
$stmt->execute([$email, $phone]);
if ($stmt->fetch()) {
  http_response_code(409);
  echo json_encode(['error' => 'An account with that email or phone number already exists.']);
  exit;
}

$passwordHash = password_hash($password, PASSWORD_DEFAULT);

try {

    $pdo->beginTransaction();

    //Create normal user account
    $stmt = $pdo->prepare(
        'INSERT INTO users
         (name, email, phone, password_hash)
         VALUES (?, ?, ?, ?)'
    );

    $stmt->execute([
        $name,
        $email,
        $phone,
        $passwordHash
    ]);

    $newUserId = (int)$pdo->lastInsertId();


    //If this registration came from a caregiver invitation,
    //finish creating the caregiver relationship
    if($invitation !== null) {

        $patientId = (int)$invitation['patient_uid'];

        $stmt = $pdo->prepare(
            'INSERT INTO caregivers
             (uid, name, email, phone_number, caregiver_uid)
             VALUES (?, ?, ?, ?, ?)'
        );

        $stmt->execute([
            $patientId,
            $invitation['name'],
            $invitation['email'],
            $invitation['phone_number'],
            $newUserId
        ]);

        //Mark new user as a caregiver
        $stmt = $pdo->prepare(
            'UPDATE users
             SET isCaregiver = 1
             WHERE id = ?'
        );

        $stmt->execute([
            $newUserId
        ]);

        //Mark invitation as used so the link cannot be used again
        $stmt = $pdo->prepare(
            'UPDATE caregiver_invitations
             SET used = 1
             WHERE iid = ?'
        );

        $stmt->execute([
            $invitationId
        ]);
    }

    $pdo->commit();
}
catch(Throwable $e) {

    if($pdo->inTransaction()) {
        $pdo->rollBack();
    }

    http_response_code(500);

    echo json_encode([
        'error' => 'Account could not be created.'
    ]);

    exit;
}

//Remove completed invitation from session
if($invitation !== null) {

    unset($_SESSION['caregiver_invite_iid']);
    unset($_SESSION['caregiver_invite_email']);
}

http_response_code(201);
echo json_encode([
  'message' => 'Account created successfully.',
  'user' => [
    'id'    => $newUserId,
    'name'  => $name,
    'email' => $email,
    'phone' => $phone,
  ],
]);
