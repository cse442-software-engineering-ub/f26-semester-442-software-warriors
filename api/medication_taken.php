<?php

require __DIR__ . '/cors.php';

header('Content-Type: application/json');
http_response_code(200);

echo json_encode([
    'success' => false,
    'error' => 'Medication taken endpoint is not available.',
]);
