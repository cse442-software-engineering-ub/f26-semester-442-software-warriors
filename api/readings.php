<?php
require __DIR__ . '/cors.php';
require __DIR__ . '/db.php';
require __DIR__ . '/require_auth.php';

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
  http_response_code(405);
  header('Allow: POST');
  echo json_encode(['error' => 'Method not allowed. Use POST.']);
  exit;
}

$uid = requireAuth();

// Allowed ranges: wide enough for real readings, narrow enough to catch typos.
$fields = [
  'systolic'  => ['label' => 'Systolic',   'min' => 70, 'max' => 250],
  'diastolic' => ['label' => 'Diastolic',  'min' => 40, 'max' => 150],
  'pulse'     => ['label' => 'Pulse rate', 'min' => 30, 'max' => 220],
];

$values = [];
$errors = [];
foreach ($fields as $key => $rule) {
  $raw = trim((string) ($_POST[$key] ?? ''));
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

// American Heart Association categories, checked from most to least serious.
function bpStatus(int $sys, int $dia): string
{
  if ($sys > 180 || $dia > 120) return 'Hypertensive crisis';
  if ($sys >= 140 || $dia >= 90) return 'High (stage 2)';
  if ($sys >= 130 || $dia >= 80) return 'High (stage 1)';
  if ($sys >= 120) return 'Slightly elevated';
  return 'Within range';
}

$status = bpStatus($values['systolic'], $values['diastolic']);

try {
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
echo json_encode(['reading' => [
  'rid'         => (int) $reading['rid'],
  'systolic'    => (int) $reading['systolic'],
  'diastolic'   => (int) $reading['diastolic'],
  'pulse'       => (int) $reading['pulse'],
  'status'      => $reading['status'],
  'recorded_at' => $reading['recorded_at'],
]]);
