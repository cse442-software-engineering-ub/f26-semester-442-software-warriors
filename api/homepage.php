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

try {
    $stmt = $pdo->prepare("SELECT systolic, diastolic, status, recorded_at FROM readings WHERE uid = :uid ORDER BY recorded_at DESC LIMIT 1");
    $stmt->execute([':uid' => $uid]);
    $bp_reading = $stmt->fetch();

    $stmt = $pdo->prepare("SELECT medication_name, dosage, time, days FROM medications WHERE uid = :uid AND FIND_IN_SET(:today, days) > 0 ORDER BY time ASC");
    $stmt->execute([':uid' => $uid, ':today' => $today]);
    $medications = $stmt->fetchAll();

    if ($medications) {

        foreach ($medications as &$med) { //reformats time from TIME to human readable
            $med['time'] = date('g:i A', strtotime($med['time']));
        }
    }

    $stmt = $pdo->prepare("SELECT doctors_name, appointment_date, notes FROM appointments WHERE uid = :uid and appointment_date > NOW() ORDER BY appointment_date ASC LIMIT 1");
    $stmt->execute([':uid' => $uid]);
    $appointment = $stmt->fetch();

    if ($appointment) {
        $appointment['appointment_date'] = date('F jS, Y, g:i a', strtotime($appointment['appointment_date']));
    }

    echo json_encode([
        "success" => true,
        "bp_reading" => $bp_reading ?: null,
        "medications" => $medications ?: null,
        "next_appointment" => $appointment ?: null
    ]);
} catch (PDOException $e) {
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'message' => 'Database error: ' . $e->getMessage()
        ]);
    }
