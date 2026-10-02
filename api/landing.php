<?php
require __DIR__ . '/cors.php';
require __DIR__ . '/db.php';

header('Content-Type: application/json');

if($_SERVER['REQUEST_METHOD'] !== 'GET') {
  http_response_code(405);
  echo json_encode(['error' => 'Method not allowed. Use GET.']);
  exit;
}

http_response_code(200);

echo json_encode([
  'message' => 'Landing page successfully loaded.'
]);