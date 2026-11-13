<?php
require __DIR__ . '/cors.php';
require __DIR__ . '/db.php';
require __DIR__ . '/require_auth.php';

header('Content-Type: application/json');

$method = $_SERVER['REQUEST_METHOD'];
if (!in_array($method, ['POST', 'PUT', 'DELETE'], true)) {
  http_response_code(405);
  header('Allow: POST, PUT, DELETE');
  echo json_encode(['error' => 'Method not allowed. Use POST, PUT or DELETE.']);
  exit;
}

$uid = requireAuth();

// Checks systolic, diastolic and pulse the same way for adding (POST) and editing (PUT).
// Sends 400 with one message per field and stops when something is wrong.
function validateReading(array $input): array
{
  // Allowed ranges: wide enough for real readings, narrow enough to catch typos.
  $fields = [
    'systolic'  => ['label' => 'Systolic',   'min' => 70, 'max' => 250],
    'diastolic' => ['label' => 'Diastolic',  'min' => 40, 'max' => 150],
    'pulse'     => ['label' => 'Pulse rate', 'min' => 30, 'max' => 220],
  ];

  $values = [];
  $errors = [];
  foreach ($fields as $key => $rule) {
    $raw = trim((string) ($input[$key] ?? ''));
    if ($raw === '') {
      $errors[$key] = "{$rule['label']} is required.";
    } elseif (!ctype_digit($raw)) {
      $errors[$key] = "{$rule['label']} must be a whole number.";
    } elseif ((int) $raw < $rule['min'] || (int) $raw > $rule['max']) {
      $errors[$key] = "{$rule['label']} must be between {$rule['min']} and {$rule['max']}.";
    } else {
      $values[$key] = (int) $raw;
    }
  }

  if (
    !isset($errors['systolic']) && !isset($errors['diastolic'])
    && $values['systolic'] <= $values['diastolic']
  ) {
    $errors['systolic'] = 'Systolic must be higher than diastolic.';
  }

  if ($errors) {
    http_response_code(400);
    echo json_encode(['errors' => $errors]);
    exit;
  }
  return $values;
}

// Turns a database row into the same JSON shape for every reply.
function readingJson(array $reading): array
{
  return [
    'rid'         => (int) $reading['rid'],
    'systolic'    => (int) $reading['systolic'],
    'diastolic'   => (int) $reading['diastolic'],
    'pulse'       => $reading['pulse'] === null ? null : (int) $reading['pulse'],
    'status'      => $reading['status'],
    'recorded_at' => $reading['recorded_at'],
  ];
}

// American Heart Association categories, checked from most to least serious.
function bpStatus(int $sys, int $dia): string
{
  if ($sys > 180 || $dia > 120) return 'Hypertensive crisis';
  if ($sys >= 140 || $dia >= 90) return 'High (stage 2)';
  if ($sys >= 130 || $dia >= 80) return 'High (stage 1)';
  if ($sys >= 120) return 'Slightly elevated';
  return 'Within range';
}

// ---------- PUT readings.php?rid=N  and  DELETE readings.php?rid=N ----------
// Only the patient who owns the reading can change it. "AND uid = ?" makes another
// user's rid look exactly like a missing one (404), so nobody can probe other people's ids.
if ($method === 'PUT' || $method === 'DELETE') {
  if ($_SESSION['isCaregiver']) {
    http_response_code(403);
    echo json_encode(['error' => 'Caregivers cannot change readings.']);
    exit;
  }

  $rid = filter_var($_GET['rid'] ?? '', FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]);
  if ($rid === false) {
    http_response_code(400);
    echo json_encode(['error' => 'A valid reading id is required.']);
    exit;
  }

  try {
    if ($method === 'DELETE') {
      $stmt = $pdo->prepare('DELETE FROM readings WHERE rid = ? AND uid = ?');
      $stmt->execute([$rid, $uid]);
      if ($stmt->rowCount() === 0) {
        http_response_code(404);
        echo json_encode(['error' => 'Reading not found.']);
        exit;
      }
      echo json_encode(['deleted' => true]);
      exit;
    }

    // PHP only fills $_POST for POST, so read the PUT body (systolic=..&diastolic=..&pulse=..) ourselves.
    parse_str(file_get_contents('php://input'), $input);
    $values = validateReading($input);

    $stmt = $pdo->prepare('SELECT rid FROM readings WHERE rid = ? AND uid = ?');
    $stmt->execute([$rid, $uid]);
    if (!$stmt->fetch()) {
      http_response_code(404);
      echo json_encode(['error' => 'Reading not found.']);
      exit;
    }

    // The status is recalculated from the new numbers; the date and time stay as they were.
    $stmt = $pdo->prepare(
      'UPDATE readings SET systolic = ?, diastolic = ?, pulse = ?, status = ?
        WHERE rid = ? AND uid = ?'
    );
    $stmt->execute([
      $values['systolic'],
      $values['diastolic'],
      $values['pulse'],
      bpStatus($values['systolic'], $values['diastolic']),
      $rid,
      $uid,
    ]);

    $stmt = $pdo->prepare('SELECT rid, systolic, diastolic, pulse, status, recorded_at FROM readings WHERE rid = ? AND uid = ?');
    $stmt->execute([$rid, $uid]);
    echo json_encode(['reading' => readingJson($stmt->fetch())]);
    exit;
  } catch (PDOException $e) {
    error_log('readings.php: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['error' => 'Could not update your reading. Please try again.']);
    exit;
  }
}

// ---------- POST readings.php (add a reading) ----------
$values = validateReading($_POST);
$status = bpStatus($values['systolic'], $values['diastolic']);

try {
  if ($_SESSION['isCaregiver']) {
    http_response_code(403);
    echo json_encode(['error' => 'Caregivers cannot save blood pressure readings, go to a patient profile to add a reading.']);
    exit();
  }
  $stmt = $pdo->prepare(
    'INSERT INTO readings (uid, systolic, diastolic, pulse, status, recorded_at)
         VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)'
  );
  $stmt->execute([$uid, $values['systolic'], $values['diastolic'], $values['pulse'], $status]);
  $rid = (int) $pdo->lastInsertId();

  $stmt = $pdo->prepare('SELECT rid, systolic, diastolic, pulse, status, recorded_at FROM readings WHERE rid = ? AND uid = ?');
  $stmt->execute([$rid, $uid]);
  $reading = $stmt->fetch();
} catch (PDOException $e) {
  error_log('readings.php: ' . $e->getMessage());
  http_response_code(500);
  echo json_encode(['error' => 'Could not save your reading. Please try again.']);
  exit;
}

http_response_code(201);
echo json_encode(['reading' => readingJson($reading)]);
