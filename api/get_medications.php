<?php
ini_set('display_errors', 1);
error_reporting(E_ALL);
require __DIR__ . '/cors.php';
require __DIR__ . '/db.php';
require_once __DIR__ . '/require_auth.php';
session_set_cookie_params([
    'lifetime' => 0,
    'path'     => '/CSE442/2026-Fall/cse-442ab/',
    'domain'   => 'aptitude.cse.buffalo.edu',
    'secure'   => true,
    'httponly' => true,
    'samesite' => 'None',
]);
session_start();

header('Content-Type: application/json');
$uid = requireAuth();
$today = date('l'); // grabs day of the week

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed. Use GET.']);
    exit();
}

try { 
    $stmt = $pdo->prepare("SELECT medication_name, dosage, time, days FROM medications WHERE uid = :uid AND FIND_IN_SET(:today, days) > 0 ORDER BY time ASC");
    $stmt->execute([':uid' => $uid, ':today' => $today]);
    $medications = $stmt->fetchAll();

    if ($medications) {

        foreach ($medications as &$med) { //reformats time from TIME to human readable
            $med['time'] = date('g:i A', strtotime($med['time']));
        }

        echo json_encode([
            'success' => true,
            'day' => $today,
            'medications' => $medications
        ]);
    } else {
        echo json_encode([
            'success' => false,
            'error' => "No medications for this user were found."
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
?>