<?php
require __DIR__ . '/cors.php';
require __DIR__ . '/require_auth.php';

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
  http_response_code(400);
  echo json_encode(['error' => 'Logout must be a POST request.']);
  exit;
}

requireAuth();

$_SESSION = [];

if (ini_get("session.use_cookies")) {
  $params = session_get_cookie_params();
  unset($params["lifetime"]);
  setcookie(session_name(), '', ['expires' => time() - 42000] + $params);
}

session_destroy();

echo json_encode(['logout' => true]);
