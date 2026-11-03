<?php
require __DIR__ . '/cors.php';
require __DIR__ . '/db.php';
require __DIR__ . '/require_auth.php';

header('Content-Type: application/json');

//whenever anything fails can call accountFail to return a code and JSON error response
function accountFail(int $status, string $message): void
{
    http_response_code($status);
    echo json_encode(['error' => $message]);
    exit;
}

//grabs user ID from requireAuth return and whatever request method is called to use 
$userId = requireAuth();
$method = $_SERVER['REQUEST_METHOD'];

//handle GET requests
if ($method === 'GET') {
    $stmt = $pdo->prepare('SELECT id, name, email, phone FROM users WHERE id = ?');
    $stmt->execute([$userId]);
    $user = $stmt->fetch();

    if (!$user) {
        accountFail(401, 'You must be logged in to view your account.');
    }

    // Include the other side of the patient-caregiver link for the shared sidebar and page headings.
    $isCaregiver = !empty($_SESSION['isCaregiver']);
    if ($isCaregiver) {
        $stmt = $pdo->prepare('SELECT name FROM users WHERE id = ?');
        $stmt->execute([$_SESSION['patientID'] ?? 0]);
    } else {
        // A patient may have multiple linked caregiver accounts; use the first one for the single-name UI.
        $stmt = $pdo->prepare(
            'SELECT name FROM users WHERE patientEmail = ? AND isCaregiver = 1 ORDER BY id ASC LIMIT 1'
        );
        $stmt->execute([$user['email']]);
    }
    $relatedPerson = $stmt->fetch();

    echo json_encode([
        'id' => (int) $user['id'],
        'name' => $user['name'],
        'email' => $user['email'],
        'phone' => $user['phone'],
        'isCaregiver' => $isCaregiver,
        'relatedPersonName' => $relatedPerson ? $relatedPerson['name'] : null
    ]);

    exit;
}

//handle POST requests
if($method === 'POST') {
    if(isset($_POST['current_password']) || isset($_POST['new_password'])){
        $currentPassword = $_POST['current_password'] ?? '';
        $newPassword = $_POST['new_password'] ?? '';

        //Password validation checks with added max length catch to not allow bee movie script as valid password
        if(!is_string($currentPassword) || !is_string($newPassword)) {
            accountFail(400, 'Invalid password format.');
        }
        if ($currentPassword === '' || $newPassword === '') {
            accountFail(400, 'Both password fields are required.');
        }
        if (strlen($newPassword) < 8) {
            accountFail(400, 'Invalid password, passwords should be at least 8 characters long');
        } 
        elseif (strlen($newPassword) > 128) {
            accountFail(400, 'Invalid password, password too long');
        } 
        elseif (!preg_match('/[A-Z]/', $newPassword) || !preg_match('/[a-z]/', $newPassword)) {
            accountFail(400, 'Invalid password, passwords must contain at least one uppercase and lowercase letter.');
        }
        elseif (!preg_match('/\d/', $newPassword) || !preg_match('/[!@#$%^&*_]/', $newPassword)) {
            accountFail(400, 'Invalid password, passwords must contain at least one number and special character');
        } 

        //Verify current password
        $stmt = $pdo->prepare('SELECT password_hash FROM users WHERE id = ?');
        $stmt->execute([$userId]);
        $user = $stmt->fetch();

        if (!$user) {
            accountFail(401, 'You must be logged in to change your password.');
        }
        if(!password_verify($currentPassword, $user['password_hash'])) {
            accountFail(401, 'Current password is incorrect.');
        }
        $newPasswordHash = password_hash($newPassword, PASSWORD_DEFAULT);
        //Update the password in the database
        $stmt = $pdo->prepare('UPDATE users SET password_hash = ? WHERE id = ?');
        $stmt->execute([$newPasswordHash, $userId]);
        http_response_code(200);
        echo json_encode(['message' => 'Password updated successfully.']);
        exit;
    }
    $hasName = array_key_exists('name', $_POST);
    $hasEmail = array_key_exists('email', $_POST);
    $hasPhone = array_key_exists('phone', $_POST);
    
    if(!$hasName && !$hasEmail && !$hasPhone) {
        accountFail(400, 'No account information provided.');
    }

    $stmt = $pdo->prepare('SELECT name, email, phone FROM users WHERE id = ?');
    $stmt->execute([$userId]);
    $currentUser = $stmt->fetch();

    if(!$currentUser) {
        accountFail(401, 'You must be logged in to update your account.');
    }

    //grabs the existing account information depending on whats being updated.
    $name = $hasName ? trim($_POST['name']) : $currentUser['name'];
    $email = $hasEmail ? trim($_POST['email']) : $currentUser['email'];
    $phone = $hasPhone ? trim($_POST['phone']) : $currentUser['phone'];

    if($name === ''){
        accountFail(400, 'Name is required.');
    }
    if($email === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)){
        accountFail(400, 'A valid email is required.');
    }
    if($phone === '' || !preg_match('/^\d{10}$/', $phone)){
        accountFail(400, 'A valid phone number (digits only) is required.');
    }

    //Make sure account information is unique
    $stmt = $pdo->prepare('SELECT id FROM users WHERE (email = ? OR phone = ?) AND id != ?');
    $stmt->execute([$email, $phone, $userId]);

    if ($stmt->fetch()) {
        accountFail(409, 'An account with that email or phone number already exists.');
    }

    //update the database with the new/existing account information
    $stmt = $pdo->prepare('UPDATE users SET name = ?, email = ?, phone = ? WHERE id = ?');
    $stmt->execute([$name, $email, $phone, $userId]);
    http_response_code(200);
    echo json_encode(['message' => 'Account updated successfully.']);
    exit;
}

//handle DELETE requests
if($method === 'DELETE') {

    try {
        $pdo->beginTransaction();

        //Get the user's email before deleting the account
        $stmt = $pdo->prepare(
            'SELECT email
             FROM users
             WHERE id = ?'
        );

        $stmt->execute([$userId]);
        $user = $stmt->fetch();

        if(!$user) {
            $pdo->rollBack();
            accountFail(401, 'You must be logged in to delete your account.');
        }

        $userEmail = $user['email'];

        //Get caregiver accounts connected to this patient
        //so their caregiver status can be updated afterward
        $stmt = $pdo->prepare(
            'SELECT DISTINCT caregiver_uid
             FROM caregivers
             WHERE uid = ?
             AND caregiver_uid IS NOT NULL'
        );

        $stmt->execute([$userId]);

        $affectedCaregiverIds = $stmt->fetchAll(
            PDO::FETCH_COLUMN
        );

        //Delete all medications belonging to the user
        $stmt = $pdo->prepare(
            'DELETE FROM medications
             WHERE uid = ?'
        );

        $stmt->execute([$userId]);

        //Delete all appointments belonging to the user
        $stmt = $pdo->prepare(
            'DELETE FROM appointments
             WHERE uid = ?'
        );

        $stmt->execute([$userId]);

        //Delete all readings belonging to the user
        $stmt = $pdo->prepare(
            'DELETE FROM readings
             WHERE uid = ?'
        );

        $stmt->execute([$userId]);

        //Delete pending caregiver invitations sent by this patient
        //or sent to this user's email
        $stmt = $pdo->prepare(
            'DELETE FROM caregiver_invitations
             WHERE patient_uid = ?
             OR LOWER(email) = LOWER(?)'
        );

        $stmt->execute([
            $userId,
            $userEmail
        ]);

        //Delete caregiver relationships where this user is either
        //the patient or the caregiver
        $stmt = $pdo->prepare(
            'DELETE FROM caregivers
             WHERE uid = ?
             OR caregiver_uid = ?'
        );

        $stmt->execute([
            $userId,
            $userId
        ]);

        //If any caregivers belonged to this patient,
        //check whether they still care for another patient
        foreach($affectedCaregiverIds as $caregiverUserId) {

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

            if($remainingRelationships === 0) {

                $stmt = $pdo->prepare(
                    'UPDATE users
                     SET isCaregiver = 0
                     WHERE id = ?'
                );

                $stmt->execute([
                    $caregiverUserId
                ]);
            }
        }

        //Delete the user's account last
        $stmt = $pdo->prepare(
            'DELETE FROM users
             WHERE id = ?'
        );

        $stmt->execute([$userId]);

        if($stmt->rowCount() === 0) {
            throw new Exception(
                'User account could not be deleted.'
            );
        }

        $pdo->commit();
    }
    catch(Throwable $e) {

        if($pdo->inTransaction()) {
            $pdo->rollBack();
        }

        accountFail(
            500,
            'Account could not be deleted.'
        );
    }

    //Clear the session after successful deletion
    $_SESSION = [];
    session_destroy();

    http_response_code(200);

    echo json_encode([
        'message' => 'Account deleted successfully.'
    ]);

    exit;
}

header('Allow: GET, POST, DELETE');
accountFail(405, 'Method not allowed. Use GET, POST, or DELETE.');