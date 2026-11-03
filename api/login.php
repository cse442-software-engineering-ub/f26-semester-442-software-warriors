<?php
require __DIR__ . '/cors.php';
require __DIR__ . '/db.php';
//require __DIR__ . '/require_auth.php';

header('Content-Type: application/json');

function loginFail(int $status, string $message): void
{
  http_response_code($status);
  echo json_encode(['login' => false, 'error' => $message]);
  exit();
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
  loginFail(400, 'Login must be a POST request.');
}

$email = $_POST['email'] ?? '';
$password = $_POST['password'] ?? '';

if (!is_string($email) || !is_string($password)) {
  loginFail(400, 'Email and password must be plain text.');
}

$email = trim($email);

if ($email === '' || $password === '') {
  loginFail(400, 'Email and password are required.');
  exit;
}

$stmt = $pdo->prepare('SELECT id, password_hash, isCaregiver, patientEmail FROM users WHERE email = ?');
$stmt->execute([$email]);
$user = $stmt->fetch();

// Always run password_verify, even for an unknown email, so both
// failures take the same time and give the same message.
$hash = $user ? $user['password_hash'] : password_hash('timing-dummy', PASSWORD_DEFAULT);
$valid = password_verify($password, $hash);

if (!$user || !$valid) {
  loginFail(401, 'Incorrect email or password.');
  exit();
}

// Only reach here on successful authentication.
if (password_needs_rehash($user['password_hash'], PASSWORD_DEFAULT)) {
  $stmt = $pdo->prepare('UPDATE users SET password_hash = ? WHERE id = ?');
  $stmt->execute([password_hash($password, PASSWORD_DEFAULT), $user['id']]);
}

//Re-enable cookies and start the session only after auth passes.
ini_set('session.use_cookies', '1');
session_set_cookie_params([
    'secure'   => true,
    'httponly' => true,
    'samesite' => 'None',
]);

session_start();
$_SESSION['user_id'] = (int) $user['id'];
$_SESSION['isCaregiver'] = (bool) $user['isCaregiver']; //sets new variable to PHPSESS cookie for caregivers

//Check if this login came from a caregiver invitation
if(isset($_SESSION['caregiver_invite_iid'])) {

    $invitationId = (int)$_SESSION['caregiver_invite_iid'];

    //Get the pending invitation
    $stmt = $pdo->prepare(
        'SELECT iid, patient_uid, name, email, phone_number, expires_at, used
         FROM caregiver_invitations
         WHERE iid = ?
         LIMIT 1'
    );

    $stmt->execute([$invitationId]);

    $invitation = $stmt->fetch();

    //Make sure the invitation still exists
    if(!$invitation) {

        unset($_SESSION['caregiver_invite_iid']);
        unset($_SESSION['caregiver_invite_email']);
        unset($_SESSION['user_id']);

        http_response_code(400);

        echo json_encode([
            'login' => false,
            'error' => 'Invalid invitation.'
        ]);

        exit;
    }

    //Make sure the invitation has not already been used
    if((int)$invitation['used'] === 1) {

        unset($_SESSION['caregiver_invite_iid']);
        unset($_SESSION['caregiver_invite_email']);
        unset($_SESSION['user_id']);

        http_response_code(400);

        echo json_encode([
            'login' => false,
            'error' => 'This invitation has already been used.'
        ]);

        exit;
    }

    //Make sure the invitation has not expired
    if(strtotime($invitation['expires_at']) <= time()) {

        unset($_SESSION['caregiver_invite_iid']);
        unset($_SESSION['caregiver_invite_email']);
        unset($_SESSION['user_id']);

        http_response_code(400);

        echo json_encode([
            'login' => false,
            'error' => 'Invitation has expired.'
        ]);

        exit;
    }

    //Get the account that just logged in
    $stmt = $pdo->prepare(
        'SELECT id, email
         FROM users
         WHERE id = ?
         LIMIT 1'
    );

    $stmt->execute([
        (int)$_SESSION['user_id']
    ]);

    $loggedInUser = $stmt->fetch();

    if(!$loggedInUser) {

        unset($_SESSION['user_id']);

        http_response_code(404);

        echo json_encode([
            'login' => false,
            'error' => 'User account not found.'
        ]);

        exit;
    }

    //Make sure the logged-in account is the account that was invited
    if(
        strtolower($loggedInUser['email']) !==
        strtolower($invitation['email'])
    ) {

        //Keep the invitation in the session so they can
        //try logging in with the correct account
        unset($_SESSION['user_id']);

        http_response_code(403);

        echo json_encode([
            'login' => false,
            'error' => 'This invitation belongs to a different account.'
        ]);

        exit;
    }

    $caregiverUserId = (int)$loggedInUser['id'];
    $patientId = (int)$invitation['patient_uid'];

    //Make sure the relationship does not already exist
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

        //The relationship already exists, so this invitation
        //should no longer be usable
        $stmt = $pdo->prepare(
            'UPDATE caregiver_invitations
             SET used = 1
             WHERE iid = ?'
        );

        $stmt->execute([$invitationId]);

        unset($_SESSION['caregiver_invite_iid']);
        unset($_SESSION['caregiver_invite_email']);
    }
    else {

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
                $invitation['email'],
                $invitation['phone_number'],
                $caregiverUserId
            ]);

            //Mark this user as a caregiver
            $stmt = $pdo->prepare(
                'UPDATE users
                 SET isCaregiver = 1
                 WHERE id = ?'
            );

            $stmt->execute([
                $caregiverUserId
            ]);

            //Expire the invitation permanently
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

            unset($_SESSION['user_id']);

            http_response_code(500);

            echo json_encode([
                'login' => false,
                'error' => 'Caregiver invitation could not be accepted.'
            ]);

            exit;
        }

        //Invitation has been completed, so remove it from the session
        unset($_SESSION['caregiver_invite_iid']);
        unset($_SESSION['caregiver_invite_email']);
    }
}

//Check whether the logged-in user is a caregiver
$stmt = $pdo->prepare(
    'SELECT uid
     FROM caregivers
     WHERE caregiver_uid = ?
     LIMIT 1'
);

$stmt->execute([
    (int)$user['id']
]);

$caregiverRelationship = $stmt->fetch();

//Set the session values used by the rest of the website
if($caregiverRelationship) {

    $_SESSION['isCaregiver'] = true;

    $_SESSION['patientID'] =
        (int)$caregiverRelationship['uid'];
}
else {

    $_SESSION['isCaregiver'] = false;

    unset($_SESSION['patientID']);
}

echo json_encode(['login' => true]);