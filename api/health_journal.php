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
        if ($_SESSION['isCaregiver']) {
            // Return caregiver identity while reading journal data for the linked patient.
            $stmt = $pdo->prepare("SELECT name, email, phone FROM users WHERE id = :uid");
            $stmt->execute([':uid' => $uid]);
            $caregiverInfo = $stmt->fetch();
            $uid = $_SESSION['patientID'];
        }
        $stmt = $pdo->prepare("SELECT systolic, diastolic, status, recorded_at, pulse FROM readings WHERE uid = :uid ORDER BY recorded_at DESC");
        $stmt->execute([':uid' => $uid]);
        $bp_readings = $stmt->fetchAll();
        $totalPulse = 0;
        $totalSystolic = 0;
        $totalDiastolic = 0;

        foreach ($bp_readings as &$reading) {
            $reading['recorded_at'] = date('F jS, Y, g:i a', strtotime($reading['recorded_at']));
            $totalPulse += $reading['pulse']; // gets each pulse from the readings to get average
            $totalSystolic += $reading['systolic'];
            $totalDiastolic += $reading['diastolic'];
        }

        $averages = null;
        if (count($bp_readings) > 0) {
            $readingCount = count($bp_readings);
            $averages = [
                "systolic" => round($totalSystolic / $readingCount),
                "diastolic" => round($totalDiastolic / $readingCount),
                "pulse" => round($totalPulse / $readingCount)
            ];
        }

        if (!$_SESSION['isCaregiver']) {
            echo json_encode([
                "success" => true,
                "bp_readings" => $bp_readings ?: null,
                "averages" => $averages,
            ]);
        } else {
            // Include caregiver identity so the frontend can identify caregiver mode.
            echo json_encode([
                "success" => true,
                "bp_readings" => $bp_readings ?: null,
                "averages" => $averages,
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