<?php
require __DIR__ . '/cors.php';
require __DIR__ . '/db.php';
require __DIR__ . '/require_auth.php';
require __DIR__ . '/view_context.php';

header('Content-Type: application/json');

$uid = requireAuth();
$method = $_SERVER['REQUEST_METHOD'];

function fail(int $status, array $body): void {
    http_response_code($status);
    echo json_encode($body);
    exit;
}

// The columns sent back to the browser (never uid)
const APPOINTMENT_COLUMNS = 'aid, doctors_name, appointment_date, location, address, notes';

// Checks the 7 popup fields. Used by POST (add) and PUT (edit), so both follow the same rules.
// Returns [values ready to save, errors]. errors is empty when everything is valid.
function checkAppointment(array $input, PDO $pdo): array {
    $doctor = trim((string)($input['doctor_name'] ?? ''));
    $month = trim((string)($input['month'] ?? ''));
    $day = trim((string)($input['day'] ?? ''));
    $year = trim((string)($input['year'] ?? ''));
    $time = trim((string)($input['time'] ?? ''));
    $location = trim((string)($input['location'] ?? ''));
    $address = trim((string)($input['address'] ?? ''));
    $errors = [];

    if ($doctor === '') {
        $errors['doctor_name'] = 'Doctor name is required.';
    } elseif (mb_strlen($doctor) > 100) {
        $errors['doctor_name'] = 'Doctor name must be 100 characters or less.';
    }

    $date = null;
    if ($month === '' || $day === '' || $year === '') {
        $errors['date'] = 'Month, day and year are required.';
    } elseif (!ctype_digit($month) || !ctype_digit($day) || !ctype_digit($year) || !checkdate((int)$month, (int)$day, (int)$year) || (int)$year > 2100) {
        $errors['date'] = 'Please enter a real date.';
    } else {
        $date = sprintf('%04d-%02d-%02d', $year, $month, $day);
    }

    // Accepts "10:30 AM", "10:30am", "9:05 PM" or 24-hour "14:30"
    $clock = null;
    if ($time === '') {
        $errors['time'] = 'Time is required.';
    } elseif (preg_match('/^(0?[1-9]|1[0-2]):([0-5]\d)\s*([AaPp])[Mm]$/', $time, $m)) {
        $hour = (int)$m[1] % 12 + (strtoupper($m[3]) === 'P' ? 12 : 0);
        $clock = sprintf('%02d:%s:00', $hour, $m[2]);
    } elseif (preg_match('/^([01]?\d|2[0-3]):([0-5]\d)$/', $time, $m)) {
        $clock = sprintf('%02d:%s:00', $m[1], $m[2]);
    } else {
        $errors['time'] = 'Time must look like 10:30 AM.';
    }

    if (mb_strlen($location) > 100) {
        $errors['location'] = 'Location must be 100 characters or less.';
    }
    if (mb_strlen($address) > 255) {
        $errors['address'] = 'Address must be 255 characters or less.';
    }

    $when = ($date && $clock) ? "$date $clock" : null;

    // Must be in the future. Ask the database, so "now" is the same clock as GET and homepage.php
    if ($when) {
        $stmt = $pdo->prepare('SELECT ? > NOW() AS future');
        $stmt->execute([$when]);
        if (!(int)$stmt->fetch()['future']) {
            $errors['date'] = 'The appointment must be in the future.';
        }
    }

    $values = [
        'doctor' => $doctor,
        'when' => $when,
        'location' => $location === '' ? null : $location,
        'address' => $address === '' ? null : $address,
    ];
    return [$values, $errors];
}

// One of MY appointments by id, or null (not found or someone else's)
function findMine(PDO $pdo, int $aid, int $uid): ?array {
    $stmt = $pdo->prepare('SELECT ' . APPOINTMENT_COLUMNS . ' FROM appointments WHERE aid = ? AND uid = ?');
    $stmt->execute([$aid, $uid]);
    $row = $stmt->fetch();
    if (!$row) {
        return null;
    }
    $row['aid'] = (int)$row['aid'];
    return $row;
}

// The ?aid=N in the URL, used by PUT and DELETE. Stops with 400 when it is missing or not a number.
function aidFromUrl(): int {
    $aid = (string)($_GET['aid'] ?? '');
    if ($aid === '' || !ctype_digit($aid)) {
        fail(400, ['error' => 'A valid appointment id is required.']);
    }
    return (int)$aid;
}

// The ?from=YYYY-MM-DD&to=YYYY-MM-DD the calendar sends (#132), or null when both are missing.
// Stops with 400 when they are not real dates, to is before from, or to is more than 42 days later.
function rangeFromUrl(): ?array {
    if (!isset($_GET['from']) && !isset($_GET['to'])) {
        return null;
    }
    $dates = [];
    foreach (['from', 'to'] as $key) {
        $value = $_GET[$key] ?? '';
        if (!is_string($value) || !preg_match('/^(\d{4})-(\d{2})-(\d{2})$/D', $value, $m) || !checkdate((int)$m[2], (int)$m[3], (int)$m[1])) {
            fail(400, ['error' => 'from and to must be real dates like 2026-12-07.']);
        }
        $dates[$key] = new DateTimeImmutable($value);
    }
    $days = (int)$dates['from']->diff($dates['to'])->format('%r%a');
    if ($days < 0 || $days > 42) {
        fail(400, ['error' => 'to must be on or after from, at most 42 days later.']);
    }
    return [$dates['from']->format('Y-m-d'), $dates['to']->format('Y-m-d')];
}

// Checked before any SQL, so a bad date never reaches the database
$range = $method === 'GET' ? rangeFromUrl() : null;

try {
    $context = getViewingContext($pdo, $uid);

    if ($context['isPatientView']) {
        $stmt = $pdo->prepare('SELECT name, email, phone FROM users WHERE id = ?');
        $stmt->execute([$uid]);
        $caregiverInfo = $stmt->fetch();
    }

    $uid = $context['uid'];

    // ---------- GET with ?from=&to=: every appointment on those days, past or upcoming (#132) ----------
    if ($method === 'GET' && $range !== null) {
        $stmt = $pdo->prepare(
            'SELECT ' . APPOINTMENT_COLUMNS . ' FROM appointments
             WHERE uid = ? AND appointment_date >= ? AND appointment_date < ? + INTERVAL 1 DAY
             ORDER BY appointment_date ASC, aid ASC'
        );
        $stmt->execute([$uid, $range[0], $range[1]]);
        $rows = $stmt->fetchAll();
        foreach ($rows as &$row) {
            $row['aid'] = (int)$row['aid'];
        }
        unset($row);
        echo json_encode(['appointments' => $rows]);
        exit;
    }

    // ---------- GET: my upcoming appointments, soonest first ----------
    if ($method === 'GET') {
        $stmt = $pdo->prepare(
            'SELECT ' . APPOINTMENT_COLUMNS . ' FROM appointments
             WHERE uid = ? AND appointment_date >= NOW()
             ORDER BY appointment_date ASC, aid ASC'
        );
        $stmt->execute([$uid]);
        $rows = $stmt->fetchAll();

        // stmt for past appointments
        $stmt = $pdo->prepare(
            'SELECT ' . APPOINTMENT_COLUMNS . ' FROM appointments
             WHERE uid = ? AND appointment_date < NOW()
             ORDER BY appointment_date DESC, aid ASC'
        );
        $stmt->execute([$uid]);
        $past_appointments = $stmt->fetchAll();
        foreach ($rows as &$row) {
            $row['aid'] = (int)$row['aid'];
        }
        foreach ($past_appointments as &$appointment) {
            $appointment['aid'] = (int)$appointment['aid'];
        }

        if ($context['isPatientView']) {
            echo json_encode(['appointments' => $rows, 'past_appointments' => $past_appointments, 'caregiverInfo' => $caregiverInfo]);
            exit();
        }
        echo json_encode(['appointments' => $rows, 'past_appointments' => $past_appointments]);
        exit;
    }

    // ---------- POST: add an appointment ----------
    if ($method === 'POST') {
        [$values, $errors] = checkAppointment($_POST, $pdo);
        if ($errors) {
            fail(400, ['errors' => $errors]);
        }

        $stmt = $pdo->prepare(
            'INSERT INTO appointments (uid, doctors_name, appointment_date, location, address)
             VALUES (?, ?, ?, ?, ?)'
        );
        $stmt->execute([$uid, $values['doctor'], $values['when'], $values['location'], $values['address']]);

        http_response_code(201);
        echo json_encode(['appointment' => findMine($pdo, (int)$pdo->lastInsertId(), $uid)]);
        exit;
    }

    // ---------- PUT: edit one of MY appointments (?aid=N) ----------
    // Same 7 fields as POST, sent as x-www-form-urlencoded. PHP only fills $_POST for POST,
    // so the body is read and parsed by hand.
    if ($method === 'PUT') {
        $aid = aidFromUrl();
        if (!findMine($pdo, $aid, $uid)) {
            // Not found OR someone else's: same answer as DELETE, so nobody can probe other users' ids
            fail(404, ['error' => 'Appointment not found.']);
        }

        parse_str(file_get_contents('php://input'), $input);

        // Only "notes" sent: save the note. Add Note is on past appointments too, so no date check.
        if (array_keys($input) === ['notes']) {
            if (!is_string($input['notes'])) {
                fail(400, ['errors' => ['notes' => 'Notes must be text.']]);
            }
            $notes = trim($input['notes']);
            if (mb_strlen($notes) > 1000) {
                fail(400, ['errors' => ['notes' => 'Notes cannot exceed 1,000 characters.']]);
            }
            $stmt = $pdo->prepare('UPDATE appointments SET notes = ? WHERE aid = ? AND uid = ?');
            $stmt->execute([$notes === '' ? null : $notes, $aid, $uid]);
            echo json_encode(['appointment' => findMine($pdo, $aid, $uid)]);
            exit;
        }

        [$values, $errors] = checkAppointment($input, $pdo);
        if ($errors) {
            fail(400, ['errors' => $errors]);
        }

        $stmt = $pdo->prepare(
            'UPDATE appointments
             SET doctors_name = ?, appointment_date = ?, location = ?, address = ?
             WHERE aid = ? AND uid = ?'
        );
        $stmt->execute([$values['doctor'], $values['when'], $values['location'], $values['address'], $aid, $uid]);

        echo json_encode(['appointment' => findMine($pdo, $aid, $uid)]);
        exit;
    }

    // ---------- DELETE: remove one of MY appointments (?aid=N) ----------
    if ($method === 'DELETE') {
        $aid = aidFromUrl();

        $stmt = $pdo->prepare('DELETE FROM appointments WHERE aid = ? AND uid = ?');
        $stmt->execute([$aid, $uid]);

        if ($stmt->rowCount() === 0) {
            // Not found OR someone else's: same answer, so nobody can probe other users' ids
            fail(404, ['error' => 'Appointment not found.']);
        }
        echo json_encode(['deleted' => true]);
        exit;
    }
} catch (PDOException $e) {
    error_log('appointments.php: ' . $e->getMessage());
    fail(500, ['error' => 'Something went wrong. Please try again.']);
}

header('Allow: GET, POST, PUT, DELETE');
fail(405, ['error' => 'Method not allowed. Use GET, POST, PUT or DELETE.']);