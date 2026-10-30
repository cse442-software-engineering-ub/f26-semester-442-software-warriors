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

