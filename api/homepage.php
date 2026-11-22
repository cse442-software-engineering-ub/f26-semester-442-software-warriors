<?php
ini_set('display_errors', 0);
error_reporting(E_ALL);
require __DIR__ . '/cors.php';
require __DIR__ . '/db.php';
require_once __DIR__ . '/require_auth.php';
require __DIR__ . '/view_context.php';

header('Content-Type: application/json');
$uid = requireAuth();
// Same timezone as medications.php, so "today" doesn't switch to tomorrow at 7 PM when the server runs on UTC
date_default_timezone_set('America/New_York');
$today = date("l");

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed. Use GET.']);
    exit();
}

try {
    $context = getViewingContext($pdo, $uid);

    if ($context['isPatientView']) {
        $stmt = $pdo->prepare("SELECT name, email, phone FROM users WHERE id = ?");
        $stmt->execute([$uid]);
        $caregiverInfo = $stmt->fetch();
    }

    $uid = $context['uid'];
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
    if (!$context['isPatientView']) {
        echo json_encode([
            "success" => true,
            "bp_reading" => $bp_reading ?: null,
            "medications" => $medications ?: null,
            "next_appointment" => $appointment ?: null
        ]);
    } else {
        echo json_encode([
            "success" => true,
            "bp_reading" => $bp_reading ?: null,
            "medications" => $medications ?: null,
            "next_appointment" => $appointment ?: null,
            "caregiver_info" => $caregiverInfo ?: null
        ]);
    }
} catch (PDOException $e) {
        error_log(basename(__FILE__) . ': ' . $e->getMessage());
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'message' => 'Something went wrong. Please try again.'
        ]);
    }
