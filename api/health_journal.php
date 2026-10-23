<?php
ini_set('display_errors', 1);
error_reporting(E_ALL);
require __DIR__ . '/cors.php';
require __DIR__ . '/db.php';
require_once __DIR__ . '/require_auth.php';

header('Content-Type: application/json');
$uid = requireAuth();
$today = date("l");

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed. Use GET.']);
    exit();
}
else {
    try {
        $stmt = $pdo->prepare("SELECT systolic, diastolic, status, recorded_at FROM readings WHERE uid = :uid ORDER BY recorded_at DESC");
        $stmt->execute([':uid' => $uid]);
        $bp_readings = $stmt->fetchAll();

        foreach ($bp_readings as &$reading) {
            $reading['recorded_at'] = date('F jS, Y, g:i a', strtotime($reading['recorded_at']));
        }

        echo json_encode([
            "success" => true,
            "bp_readings" => $bp_readings ?: null,
        ]);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'message' => 'Database error: ' . $e->getMessage()
        ]);
    }
}