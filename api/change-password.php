<?php
require __DIR__ . '/cors.php';

http_response_code(501);
header('Content-Type: application/json');
echo json_encode(["error" => "This endpoint is not implemented."]);
