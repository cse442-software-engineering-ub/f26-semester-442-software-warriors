<?php
require __DIR__ . '/session_setup.php';

$allowedOrigins = [
    'http://localhost:5173',
    'https://aptitude.cse.buffalo.edu',
    'https://cattle.cse.buffalo.edu',
];
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if (in_array($origin, $allowedOrigins, true)) {
    header("Access-Control-Allow-Origin: $origin");
    header('Access-Control-Allow-Credentials: true');
}
header('Vary: Origin');
header('Access-Control-Allow-Methods: POST, GET, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json');
http_response_code(200);

echo json_encode([
    'success' => false,
    'error' => 'Saving permissions is not implemented.',
]);
