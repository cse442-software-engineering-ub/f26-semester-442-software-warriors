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

    $validStatuses = ['active', 'inactive', 'as needed'];

    if(!in_array($status, $validStatuses, true)) {
        medicationFail(400, 'Status must be active, inactive, or as needed.');
    }

    // As needed medications do not use scheduled days
    if($status === 'as needed') {
        $days = '';
    }

    elseif($days === '') {
        medicationFail(400, 'Days are required.');
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

//Handle PUT requests
if($method === 'PUT') {

    $data = json_decode(file_get_contents('php://input'), true);

    if(!is_array($data)) {
        medicationFail(400, 'Invalid request data.');
    }

    $mid = $data['mid'] ?? null;
    $medicationName = trim($data['medication_name'] ?? '');
    $dosage = trim($data['dosage'] ?? '');
    $time = trim($data['time'] ?? '');
    $days = trim($data['days'] ?? '');
    $status = trim($data['status'] ?? '');

    //Make sure a medication ID was provided
    if($mid === null || filter_var($mid, FILTER_VALIDATE_INT) === false || (int)$mid <= 0) {
    medicationFail(400, 'Medication ID is required.');
    }

    if($medicationName === '') {
        medicationFail(400, 'Medication name is required.');
    }

    if($dosage === '') {
        medicationFail(400, 'Dosage is required.');
    }

    if($time === '') {
        medicationFail(400, 'Time is required.');
    }

    $validStatuses = ['active', 'inactive', 'as needed'];

    if(!in_array($status, $validStatuses, true)) {
        medicationFail(400, 'Status must be active, inactive, or as needed.');
    }

    if($status === 'as needed') {
        $days = '';
    }

    elseif($days === '') {
        medicationFail(400, 'Days are required.');
    }

    //Convert the time into the database format
    $timeValue = strtotime($time);

    if($timeValue === false) {
        medicationFail(400, 'A valid time is required.');
    }

    $databaseTime = date('H:i:s', $timeValue);

    //Make sure the medication exists and belongs to the logged-in user
    $stmt = $pdo->prepare(
        'SELECT mid FROM medications WHERE mid = ? AND uid = ?'
    );

    $stmt->execute([
        (int) $mid,
        $userId
    ]);

     if(!$stmt->fetch()) {
        medicationFail(404, 'Medication not found.');
    }

    //Update the medication
    $stmt = $pdo->prepare(
        'UPDATE medications
         SET medication_name = ?, dosage = ?, time = ?, days = ?, status = ?
         WHERE mid = ? AND uid = ?'
    );

    $stmt->execute([
        $medicationName,
        $dosage,
        $databaseTime,
        $days,
        $status,
        (int) $mid,
        $userId
    ]);

    echo json_encode([
        'success' => true
    ]);

    exit;
}

//Handle DELETE requests
if($method === 'DELETE') {

    $data = json_decode(file_get_contents('php://input'), true);

    if(!is_array($data)) {
        medicationFail(400, 'Invalid request data.');
    }

    $mid = $data['mid'] ?? null;

    //Make sure a medication ID was provided
    if($mid === null || filter_var($mid, FILTER_VALIDATE_INT) === false || (int)$mid <= 0) {
    medicationFail(400, 'Medication ID is required.');
    }

    //Delete only a medication belonging to the logged-in user
    $stmt = $pdo->prepare(
        'DELETE FROM medications
         WHERE mid = ? AND uid = ?'
    );

    $stmt->execute([
        (int) $mid, $userId
    ]);

    if($stmt->rowCount() === 0) {
        medicationFail(404, 'Medication not found.');
    }

    echo json_encode([
        'success' => true
    ]);

    exit;
}

//Reject unsupported request methods
header('Allow: GET, POST, PUT, DELETE');
medicationFail(405, 'Method not allowed. Use GET, POST, PUT, or DELETE.');
