<?php

require __DIR__ . '/cors.php';
require __DIR__ . '/db.php';
require __DIR__ . '/require_auth.php';

header('Content-Type: application/json');

//Returns an error response whenever a medications request fails
function medicationFail(int $status, string $message): void
{
    http_response_code($status);
    echo json_encode([
        'success' => false,
        'error' => $message
    ]);
    exit;
}

//Get the logged-in user's ID from their session
$userId = requireAuth();

//Get the request method being used
$method = $_SERVER['REQUEST_METHOD'];

//Handle GET requests
if($method === 'GET') {

    //Get only medications belonging to the logged-in user
    $stmt = $pdo->prepare(
        'SELECT mid, medication_name, dosage, time, days, status
         FROM medications
         WHERE uid = ?
         ORDER BY time ASC'
    );

    $stmt->execute([$userId]);

    $medications = $stmt->fetchAll();

    echo json_encode([
        'success' => true,
        'medications' => $medications
    ]);

    exit;
}

//Handle POST requests
if($method === 'POST') {

    $medicationName = trim($_POST['medication_name'] ?? '');
    $dosage = trim($_POST['dosage'] ?? '');
    $time = trim($_POST['time'] ?? '');
    $days = trim($_POST['days'] ?? '');
    $status = trim($_POST['status'] ?? '');

    //Make sure all required medication information was provided
    if($medicationName === '') {
        medicationFail(400, 'Medication name is required.');
    }

    if($dosage === '') {
        medicationFail(400, 'Dosage is required.');
    }

    if($time === '') {
        medicationFail(400, 'Time is required.');
    }

    if($days === '') {
        medicationFail(400, 'Days are required.');
    }

    //Only allow the three statuses supported by the database
    $validStatuses = ['active', 'inactive', 'as needed'];

    if(!in_array($status, $validStatuses, true)) {
        medicationFail(400, 'Status must be active, inactive, or as needed.');
    }

    //Convert the supplied time into the format used by the database
    $timeValue = strtotime($time);

    if ($timeValue === false) {
        medicationFail(400, 'A valid time is required.');
    }

    $databaseTime = date('H:i:s', $timeValue);

    //Add the medication for the currently logged-in user
    $stmt = $pdo->prepare(
        'INSERT INTO medications
        (uid, medication_name, dosage, time, days, status)
        VALUES (?, ?, ?, ?, ?, ?)'
    );

    $stmt->execute([
        $userId,
        $medicationName,
        $dosage,
        $databaseTime,
        $days,
        $status
    ]);
    //Success
    http_response_code(201);

    echo json_encode([
        'success' => true,
        'mid' => (int) $pdo->lastInsertId()
    ]);

    exit;
}

