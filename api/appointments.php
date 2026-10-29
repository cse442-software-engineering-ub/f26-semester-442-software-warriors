<?php
require __DIR__ . '/cors.php';
require __DIR__ . '/db.php';
require __DIR__ . '/require_auth.php';

header('Content-Type: application/json');

$uid = requireAuth();
$method = $_SERVER['REQUEST_METHOD'];

function fail(int $status, array $body): void
{
  http_response_code($status);
  echo json_encode($body);
  exit;
}

// The columns sent back to the browser (never uid or notes)
const APPOINTMENT_COLUMNS = 'aid, doctors_name, appointment_date, location, address';

try {

  $caregiver = false;
  if ($_SESSION['isCaregiver']) { // if caregiver then set the uid we grab info from, from the patients db
    $stmt = $pdo->prepare("SELECT name, email, phone FROM users WHERE id = :uid");
    $stmt->execute([':uid' => $uid]);
    $caregiverInfo = $stmt->fetch();
    $uid = $_SESSION['patientID'];
    $caregiver = true;
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
    foreach ($rows as &$row) {
      $row['aid'] = (int) $row['aid'];
    }
    if (!$caregiver) {
      echo json_encode(['appointments' => $rows]);
    } else { // adds caregiver info tp json when logged in as a caregiver
      echo json_encode([
        'appointments' => $rows,
        'caregiver_info' => $caregiverInfo
      ]);
    }
    exit;
  }

  // ---------- POST: add an appointment ----------
  if ($method === 'POST') {
    $doctor   = trim((string) ($_POST['doctor_name'] ?? ''));
    $month    = trim((string) ($_POST['month'] ?? ''));
    $day      = trim((string) ($_POST['day'] ?? ''));
    $year     = trim((string) ($_POST['year'] ?? ''));
    $time     = trim((string) ($_POST['time'] ?? ''));
    $location = trim((string) ($_POST['location'] ?? ''));
    $address  = trim((string) ($_POST['address'] ?? ''));
    $errors = [];

    if ($doctor === '') {
      $errors['doctor_name'] = 'Doctor name is required.';
    } elseif (mb_strlen($doctor) > 100) {
      $errors['doctor_name'] = 'Doctor name must be 100 characters or less.';
    }

    $date = null;
    if ($month === '' || $day === '' || $year === '') {
      $errors['date'] = 'Month, day and year are required.';
    } elseif (
      !ctype_digit($month) || !ctype_digit($day) || !ctype_digit($year)
      || !checkdate((int) $month, (int) $day, (int) $year) || (int) $year > 2100
    ) {
      $errors['date'] = 'Please enter a real date.';
    } else {
      $date = sprintf('%04d-%02d-%02d', $year, $month, $day);
    }

    // Accepts "10:30 AM", "10:30am", "9:05 PM" or 24-hour "14:30"
    $clock = null;
    if ($time === '') {
      $errors['time'] = 'Time is required.';
    } elseif (preg_match('/^(0?[1-9]|1[0-2]):([0-5]\d)\s*([AaPp])[Mm]$/', $time, $m)) {
      $hour = (int) $m[1] % 12 + (strtoupper($m[3]) === 'P' ? 12 : 0);
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
      if (!(int) $stmt->fetch()['future']) {
        $errors['date'] = 'The appointment must be in the future.';
      }
    }

    if ($errors) {
      fail(400, ['errors' => $errors]);
    }

    $stmt = $pdo->prepare(
      'INSERT INTO appointments (uid, doctors_name, appointment_date, location, address)
       VALUES (?, ?, ?, ?, ?)'
    );
    $stmt->execute([
      $uid,
      $doctor,
      $when,
      $location === '' ? null : $location,
      $address === '' ? null : $address,
    ]);
    $aid = (int) $pdo->lastInsertId();

    $stmt = $pdo->prepare('SELECT ' . APPOINTMENT_COLUMNS . ' FROM appointments WHERE aid = ? AND uid = ?');
    $stmt->execute([$aid, $uid]);
    $saved = $stmt->fetch();
    $saved['aid'] = (int) $saved['aid'];

    http_response_code(201);
    echo json_encode(['appointment' => $saved]);
    exit;
  }

  // ---------- DELETE: remove one of MY appointments (?aid=N) ----------
  if ($method === 'DELETE') {
    $aid = (string) ($_GET['aid'] ?? '');
    if ($aid === '' || !ctype_digit($aid)) {
      fail(400, ['error' => 'A valid appointment id is required.']);
    }

    $stmt = $pdo->prepare('DELETE FROM appointments WHERE aid = ? AND uid = ?');
    $stmt->execute([(int) $aid, $uid]);

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

header('Allow: GET, POST, DELETE');
fail(405, ['error' => 'Method not allowed. Use GET, POST or DELETE.']);
