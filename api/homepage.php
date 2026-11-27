<?php
ini_set('display_errors', 0);
error_reporting(E_ALL);
require __DIR__ . '/cors.php';
require __DIR__ . '/db.php';
require_once __DIR__ . '/require_auth.php';
require __DIR__ . '/view_context.php';

header('Content-Type: application/json');
$uid = requireAuth();
$today = new DateTime('today');
$date = date("l");

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

    // Today's window (use separate objects so one doesn't mutate the other)
    $dayStart = new DateTime('today');
    $dayEnd   = (clone $dayStart)->modify('+1 day');

    $stmt = $pdo->prepare(
        "SELECT m.mid, m.medication_name, m.dosage, m.time, m.days, m.status, m.as_needed,
                doses.taken_at, COALESCE(doses.taken_count, 0) AS taken_count
         FROM medications m
         LEFT JOIN (
             SELECT mid, MAX(taken_at) AS taken_at, COUNT(*) AS taken_count
             FROM medication_doses
             WHERE taken_at >= ? AND taken_at < ?
             GROUP BY mid
         ) doses ON doses.mid = m.mid
         WHERE m.uid = ?
           AND m.status = 'active'
           AND FIND_IN_SET(?, m.days) > 0
         ORDER BY m.time ASC"
    );
    $stmt->execute([
        $dayStart->format('Y-m-d H:i:s'),
        $dayEnd->format('Y-m-d H:i:s'),
        $uid,
        $date
    ]);
    $allMeds = $stmt->fetchAll();

    $scheduled = [];
    $asNeeded  = [];
    foreach ($allMeds as $med) {
        $med['time'] = date('g:i A', strtotime($med['time']));
        if ($med['as_needed']) {
            $asNeeded[] = $med;            // always shown, can be taken any time
        } elseif ($med['taken_count'] < 1) {
            $scheduled[] = $med;           // scheduled and not yet taken today
        }
    }

    // Next 3 untaken scheduled meds (already in time order), then as-needed meds
    $medications = array_merge(array_slice($scheduled, 0, 3), $asNeeded);

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
            "next_appointment" => $appointment ?: null,
            "removed" => $array_remove ?: null
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
