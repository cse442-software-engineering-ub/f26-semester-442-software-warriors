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
        if ($_SESSION['isCaregiver']) { // if caregiver then set the uid we grab info from, from the patients db
            $stmt = $pdo->prepare("SELECT name, email, phone FROM users WHERE uid = :uid");
            $stmt->execute([':uid' => $uid]);
            $caregiverInfo = $stmt->fetch();
            $uid = $_SESSION['patientID'];
        }
        $stmt = $pdo->prepare("SELECT systolic, diastolic, status, recorded_at, pulse FROM readings WHERE uid = :uid ORDER BY recorded_at DESC");
        $stmt->execute([':uid' => $uid]);
        $bp_readings = $stmt->fetchAll();
        $totalPulse = 0;

        foreach ($bp_readings as &$reading) {
            $reading['recorded_at'] = date('F jS, Y, g:i a', strtotime($reading['recorded_at']));
            $totalPulse += $reading['pulse']; // gets each pulse from the readings to get average
        }

        $totalPulse = $totalPulse / sizeof($bp_readings);

        echo json_encode([
            "success" => true,
            "bp_readings" => $bp_readings ?: null,
            "average_pulse" => $totalPulse ?: null
        ]);
        if (!$_SESSION['isCargiver']) {
            echo json_encode([
                "success" => true,
                "bp_readings" => $bp_readings ?: null,
                "average_pulse" => $totalPulse ?: null
            ]);
        } else { // adds caregiver info tp json when logged in as a caregiver
            echo json_encode([
                "success" => true,
                "bp_readings" => $bp_readings ?: null,
                "average_pulse" => $totalPulse ?: null,
                "caregiver_info" => $caregiverInfo
            ]);
        }
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'message' => 'Database error: ' . $e->getMessage()
        ]);
    }
}