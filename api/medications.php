<?php
require __DIR__ . '/cors.php';
require __DIR__ . '/db.php';
require __DIR__ . '/require_auth.php';
require __DIR__ . '/input.php';
require __DIR__ . '/view_context.php';

header('Content-Type: application/json');

// Returns an error response whenever a medications request fails
function medicationFail(int $status, string $message): void {
    http_response_code($status);
    echo json_encode([
        'success' => false,
        'error' => $message
    ]);
    exit;
}

// Convert the as_needed value into true or false so multiple input types are accepted
function parseAsNeeded($value): bool {
    if ($value === true || $value === 1 || $value === '1' || $value === 'true') {
        return true;
    }

    if ($value === false || $value === 0 || $value === '0' || $value === 'false' || $value === '' || $value === null) {
        return false;
    }

    medicationFail(400, 'As needed must be true or false.');
}

// Get the logged-in user's ID from their session
$userId = requireAuth();

// Get the request method being used
$method = $_SERVER['REQUEST_METHOD'];
$context = getViewingContext($pdo, $userId);
$caregiver = $context['isPatientView'];

if ($caregiver) {
    $stmt = $pdo->prepare('SELECT name, email, phone FROM users WHERE id = ?');
    $stmt->execute([$userId]);
    $caregiverInfo = $stmt->fetch();
}

$userId = $context['uid'];

// Handle GET requests
if ($method === 'GET') {
    $today = new DateTimeImmutable('today', new DateTimeZone('America/New_York'));

    // Get only medications belonging to the selected user
    $stmt = $pdo->prepare(
        "SELECT m.mid, medication_name, dosage, time, days, status, as_needed,
                doses.taken_at, COALESCE(doses.taken_count, 0) AS taken_count
         FROM medications m
         LEFT JOIN (
             SELECT mid, MAX(taken_at) AS taken_at, COUNT(*) AS taken_count
             FROM medication_doses
             WHERE taken_at >= ? AND taken_at < ?
             GROUP BY mid
         ) doses ON doses.mid = m.mid
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

    $stmt->execute([
        $today->format('Y-m-d H:i:s'),
        $today->modify('+1 day')->format('Y-m-d H:i:s'),
        $userId
    ]);

    $medications = $stmt->fetchAll();

    // Makes it so GET returns true/false for as_needed and an integer for taken_count
    foreach ($medications as &$medication) {
        $medication['as_needed'] = (bool)$medication['as_needed'];
        $medication['taken_count'] = (int)$medication['taken_count'];
    }
    unset($medication);

    if (!$caregiver) {
        echo json_encode([
            'success' => true,
            'medications' => $medications
        ]);
    } else {
        echo json_encode([
            'success' => true,
            'medications' => $medications,
            'caregiver_info' => $caregiverInfo
        ]);
    }

    exit();
}

// Handle POST requests
if ($method === 'POST') {
    $medicationName = textInput($_POST, 'medication_name');
    $dosage = textInput($_POST, 'dosage');
    $time = textInput($_POST, 'time');
    $days = textInput($_POST, 'days');
    $status = textInput($_POST, 'status');
    $asNeeded = parseAsNeeded($_POST['as_needed'] ?? false);

    // Make sure all required medication information was provided
    if ($medicationName === '') {
        medicationFail(400, 'Medication name is required.');
    }
    if ($dosage === '') {
        medicationFail(400, 'Dosage is required.');
    }
    // Same limits as the Medications form; longer text would not fit in the database
    if (mb_strlen($medicationName) > 70) {
        medicationFail(400, 'Medication name can be at most 70 characters.');
    }
    if (mb_strlen($dosage) > 15) {
        medicationFail(400, 'Dosage can be at most 15 characters.');
    }
    if (mb_strlen($days) > 100) {
        medicationFail(400, 'Days are not valid.');
    }

    $validStatuses = ['active', 'inactive'];
    if (!in_array($status, $validStatuses, true)) {
        medicationFail(400, 'Status must be active or inactive.');
    }

    // As needed medications do not use scheduled days or times
    if ($asNeeded) {
        $days = '';
        $databaseTime = null;
    } else {
        if ($time === '') {
            medicationFail(400, 'Time is required.');
        }
        if ($days === '') {
            medicationFail(400, 'Days are required.');
        }

        // Convert the time into the database format
        $timeValue = strtotime($time);
        if ($timeValue === false) {
            medicationFail(400, 'A valid time is required.');
        }
        $databaseTime = date('H:i:s', $timeValue);
    }

    // Add the medication for the selected user
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

    http_response_code(201);
    echo json_encode([
        'success' => true,
        'mid' => (int)$pdo->lastInsertId()
    ]);
    exit;
}

// Handle PUT requests
if ($method === 'PUT') {
    $data = json_decode(file_get_contents('php://input'), true);
    if (!is_array($data)) {
        medicationFail(400, 'Invalid request data.');
    }

    $mid = $data['mid'] ?? null;
    $medicationName = textInput($data, 'medication_name');
    $dosage = textInput($data, 'dosage');
    $time = textInput($data, 'time');
    $days = textInput($data, 'days');
    $status = textInput($data, 'status');
    $asNeeded = parseAsNeeded($data['as_needed'] ?? false);

    if ($mid === null || filter_var($mid, FILTER_VALIDATE_INT) === false || (int)$mid <= 0) {
        medicationFail(400, 'Medication ID is required.');
    }
    if ($medicationName === '') {
        medicationFail(400, 'Medication name is required.');
    }
    if ($dosage === '') {
        medicationFail(400, 'Dosage is required.');
    }
    // Same limits as the Medications form; longer text would not fit in the database
    if (mb_strlen($medicationName) > 70) {
        medicationFail(400, 'Medication name can be at most 70 characters.');
    }
    if (mb_strlen($dosage) > 15) {
        medicationFail(400, 'Dosage can be at most 15 characters.');
    }
    if (mb_strlen($days) > 100) {
        medicationFail(400, 'Days are not valid.');
    }

    $validStatuses = ['active', 'inactive'];
    if (!in_array($status, $validStatuses, true)) {
        medicationFail(400, 'Status must be active or inactive.');
    }

    // As needed medications do not use scheduled days or times
    if ($asNeeded) {
        $days = '';
        $databaseTime = null;
    } else {
        if ($time === '') {
            medicationFail(400, 'Time is required.');
        }
        if ($days === '') {
            medicationFail(400, 'Days are required.');
        }

        $timeValue = strtotime($time);
        if ($timeValue === false) {
            medicationFail(400, 'A valid time is required.');
        }
        $databaseTime = date('H:i:s', $timeValue);
    }

    // Make sure the medication exists and belongs to the selected user
    $stmt = $pdo->prepare('SELECT mid FROM medications WHERE mid = ? AND uid = ?');
    $stmt->execute([(int)$mid, $userId]);
    if (!$stmt->fetch()) {
        medicationFail(404, 'Medication not found.');
    }

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
        (int)$mid,
        $userId
    ]);

    echo json_encode(['success' => true]);
    exit;
}

// Handle DELETE requests
if ($method === 'DELETE') {
    $data = json_decode(file_get_contents('php://input'), true);
    if (!is_array($data)) {
        medicationFail(400, 'Invalid request data.');
    }

    $mid = $data['mid'] ?? null;
    if ($mid === null || filter_var($mid, FILTER_VALIDATE_INT) === false || (int)$mid <= 0) {
        medicationFail(400, 'Medication ID is required.');
    }

    // Keep dose deletion and medication deletion together in one transaction.
    try {
        $pdo->beginTransaction();

        $stmt = $pdo->prepare('SELECT mid FROM medications WHERE mid = ? AND uid = ? FOR UPDATE');
        $stmt->execute([(int)$mid, $userId]);

        if (!$stmt->fetch()) {
            $pdo->rollBack();
            medicationFail(404, 'Medication not found.');
        }

        $stmt = $pdo->prepare('DELETE FROM medication_doses WHERE mid = ?');
        $stmt->execute([(int)$mid]);

        $stmt = $pdo->prepare('DELETE FROM medications WHERE mid = ? AND uid = ?');
        $stmt->execute([(int)$mid, $userId]);
        $pdo->commit();
    } catch (PDOException $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        error_log('Failed to delete medication: ' . $e->getMessage());
        medicationFail(500, 'Medication could not be deleted.');
    }

    echo json_encode(['success' => true]);
    exit;
}

header('Allow: GET, POST, PUT, DELETE');
medicationFail(405, 'Method not allowed. Use GET, POST, PUT, or DELETE.');
