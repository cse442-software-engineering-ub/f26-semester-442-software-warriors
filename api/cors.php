<?php
$allowed_origins = [
    'http://localhost:5173',
    'https://aptitude.cse.buffalo.edu',
    'https://cattle.cse.buffalo.edu',
];

$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if (in_array($origin, $allowed_origins, true)) {
    header("Access-Control-Allow-Origin: $origin");
    header('Access-Control-Allow-Credentials: true');
}
header('Vary: Origin');
header('Access-Control-Allow-Methods: POST, GET, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Access-Control-Allow-Credentials: true');

// CSRF guard: a browser always sends Origin on cross-site POST/PUT/DELETE.
// If it is there and not one of our sites, refuse before any data changes.
// (Postman and curl send no Origin, so API tests still work.)
$scheme = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
$selfOrigin = $scheme . '://' . ($_SERVER['HTTP_HOST'] ?? '');
$unsafe = !in_array($_SERVER['REQUEST_METHOD'], ['GET', 'HEAD', 'OPTIONS'], true);
if ($unsafe && $origin !== '' && $origin !== $selfOrigin && !in_array($origin, $allowed_origins, true)) {
    http_response_code(403);
    header('Content-Type: application/json');
    echo json_encode(['error' => 'Request blocked: unknown origin.']);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}
