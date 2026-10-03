<?php
require __DIR__ . '/cors.php';

http_response_code(401);
header('Content-Type: application/json');
echo json_encode(["error" => "Something went wrong."]);