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

//Convert the as_needed value into true or false so multiple input types are accepted
function parseAsNeeded($value): bool
{
    if(
        $value === true ||
        $value === 1 ||
        $value === '1' ||
        $value === 'true'
    ) {
        return true;
    }

    if(
        $value === false ||
        $value === 0 ||
        $value === '0' ||
        $value === 'false' ||
        $value === '' ||
        $value === null
    ) {
        return false;
    }

    medicationFail(400, 'As needed must be true or false.');
}

//Get the logged-in user's ID from their session
$userId = requireAuth();

//Get the request method being used
$method = $_SERVER['REQUEST_METHOD'];
$caregiver = false;

if ($_SESSION['isCaregiver']) { // if caregiver then set the uid we grab info from, from the patients db
    $stmt = $pdo->prepare("SELECT name, email, phone FROM users WHERE id = :uid");
    $stmt->execute([':uid' => $userId]);
    $caregiverInfo = $stmt->fetch();
    $userId = $_SESSION['patientID'];
    $caregiver = true;
}
//Handle GET requests
if($method === 'GET') {

    //Get only medications belonging to the logged-in user
    $stmt = $pdo->prepare(
        "SELECT mid, medication_name, dosage, time, days, status, as_needed
         FROM medications
         WHERE uid = ?
         ORDER BY
         CASE
            WHEN status = 'active' AND as_needed = 1 THEN 1
            WHEN status = 'active' AND as_needed = 0 THEN 2
            WHEN status = 'inactive' AND as_needed = 1 THEN 3
            WHEN status = 'inactive' AND as_needed = 0 THEN 4
         END,
         time ASC"
    );

    $stmt->execute([$userId]);

    $medications = $stmt->fetchAll();

    //Makes it so GET returns 'true' or 'false' for the as_needed field instead of 1 or 0
    foreach($medications as &$medication) {
    $medication['as_needed'] = (bool) $medication['as_needed'];
    }

    unset($medication);

    if (!$caregiver) {
      echo json_encode([
        'success' => true,
        'medications' => $medications
    ]);
    } else { // adds caregiver info tp json when logged in as a caregiver
      echo json_encode([
        'success' => true,
        'medications' => $medications,
        'caregiver_info' => $caregiverInfo,
      ]);
    }

    exit();
}

//Handle POST requests
if($method === 'POST') {

    $medicationName = trim($_POST['medication_name'] ?? '');
    $dosage = trim($_POST['dosage'] ?? '');
    $time = trim($_POST['time'] ?? '');
    $days = trim($_POST['days'] ?? '');
    $status = trim($_POST['status'] ?? '');
    $asNeeded = parseAsNeeded($_POST['as_needed'] ?? false);

    //Make sure all required medication information was provided
    if($medicationName === '') {
        medicationFail(400, 'Medication name is required.');
    }

    if($dosage === '') {
        medicationFail(400, 'Dosage is required.');
    }

    $validStatuses = ['active', 'inactive'];

    if(!in_array($status, $validStatuses, true)) {
        medicationFail(400, 'Status must be active or inactive.');
    }

    //As needed medications do not use scheduled days or times
    if($asNeeded) {
        $days = '';
        $databaseTime = null;
    }

    else {
        if($time === '') {
            medicationFail(400, 'Time is required.');
        }

        if($days === '') {
            medicationFail(400, 'Days are required.');
        }

        //Convert the time into the database format
        $timeValue = strtotime($time);

        if($timeValue === false) {
            medicationFail(400, 'A valid time is required.');
        }

        $databaseTime = date('H:i:s', $timeValue);
    }

    //Add the medication for the currently logged-in user
    $stmt = $pdo->prepare(
        'INSERT INTO medications
        (uid, medication_name, dosage, time, days, status, as_needed)
        VALUES (?, ?, ?, ?, ?, ?, ?)'
    );

    $stmt->execute([
        $userId,
        $medicationName,
        $dosage,
        $databaseTime,
        $days,
        $status,
        $asNeeded ? 1 : 0
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
    $asNeeded = parseAsNeeded($data['as_needed'] ?? false);

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

    $validStatuses = ['active', 'inactive'];

    if(!in_array($status, $validStatuses, true)) {
        medicationFail(400, 'Status must be active or inactive.');
    }

    //As needed medications do not use scheduled days or times
    if($asNeeded) {
        $days = '';
        $databaseTime = null;
    }

    else {
        if($time === '') {
            medicationFail(400, 'Time is required.');
        }

        if($days === '') {
            medicationFail(400, 'Days are required.');
        }

        //Convert the time into the database format
        $timeValue = strtotime($time);

        if($timeValue === false) {
            medicationFail(400, 'A valid time is required.');
        }

        $databaseTime = date('H:i:s', $timeValue);
    }

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
         SET medication_name = ?, dosage = ?, time = ?, days = ?, status = ?, as_needed = ?
         WHERE mid = ? AND uid = ?'
    );

    $stmt->execute([
        $medicationName,
        $dosage,
        $databaseTime,
        $days,
        $status,
        $asNeeded ? 1 : 0,
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
