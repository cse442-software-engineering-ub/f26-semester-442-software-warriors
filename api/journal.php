<?php
require __DIR__ . '/cors.php';

header('Content-Type: application/json');
http_response_code(501);

// Temporary error response so the frontend endpoint exists for DevTools overrides.
echo json_encode(['error' => 'Journal endpoint is not implemented.']);
