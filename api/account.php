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



