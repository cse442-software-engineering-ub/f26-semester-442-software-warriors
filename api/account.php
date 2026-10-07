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
        accountFail(404, 'Account not found');
    }

    echo json_encode([
        'id' => (int) $user['id'],
        'name' => $user['name'],
        'email' => $user['email'],
        'phone' => $user['phone']
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
        accountFail(400, 'Name is required');
    }
    if($email === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)){
        accountFail(400, 'A valid email is required');
    }
    if($phone === '' || !preg_match('/^\d{7,15}$/', $phone)){
        accountFail(400, 'A valid phone number (digits only) is required');
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
    $stmt = $pdo->prepare('DELETE FROM users WHERE id = ?');
    $stmt->execute([$userId]);

    if($stmt->rowCount() === 0) {
        accountFail(404, 'You must be logged in to delete your account.');
    }
    
    //clears the session and returns successful account deletion message
    $_SESSION = [];
    session_destroy();
    http_response_code(200);
    echo json_encode(['message' => 'Account deleted successfully.']);
    exit;
}