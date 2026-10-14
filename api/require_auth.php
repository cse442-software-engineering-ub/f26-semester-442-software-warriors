<?php
if (session_status() === PHP_SESSION_NONE) {
    session_set_cookie_params([
        'secure' => true,
        'httponly' => true,
        'samesite' => 'None',
    ]);
    session_start();
}

function requireAuth(): int
{
    if (!isset($_SESSION['user_id'])) {
        http_response_code(401);
        header('Content-Type: application/json');
        echo json_encode(['error' => 'You must be logged in.']);
        exit;
    }
    return (int) $_SESSION['user_id'];
}
