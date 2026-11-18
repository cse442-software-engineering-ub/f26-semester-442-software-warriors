<?php
require __DIR__ . '/cors.php';
require __DIR__ . '/db.php';
require __DIR__ . '/require_auth.php';
require __DIR__ . '/view_context.php';

header('Content-Type: application/json');

function medicationTakenFail(int $status, string $message): void {
    http_response_code($status);
    echo json_encode(['success' => false, 'error' => $message]);
    exit;
}

$userId = requireAuth();
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    header('Allow: POST');
    medicationTakenFail(405, 'Method not allowed');
}

$mid = $_POST['mid'] ?? null;
if ($mid === null || filter_var($mid, FILTER_VALIDATE_INT) === false || (int)$mid <= 0) {
    medicationTakenFail(400, 'Valid medication ID is required');
}

$context = getViewingContext($pdo, $userId);
$userId = $context['uid'];

try {
    $pdo->beginTransaction();

    // Lock the medication so concurrent requests cannot insert duplicate scheduled doses.
    $stmt = $pdo->prepare(
        'SELECT status, as_needed FROM medications WHERE mid = ? AND uid = ? FOR UPDATE'
    );
    $stmt->execute([(int)$mid, $userId]);
    $medication = $stmt->fetch();

    if (!$medication) {
        $pdo->rollBack();
        medicationTakenFail(404, 'Medication not found');
    }

    if ($medication['status'] !== 'active') {
        $pdo->rollBack();
        medicationTakenFail(400, 'Medication is not active');
    }

    $now = new DateTimeImmutable('now', new DateTimeZone('America/New_York'));
    $today = $now->setTime(0, 0);
    $stmt = $pdo->prepare(
        'SELECT MAX(taken_at) AS taken_at, COUNT(*) AS taken_count
         FROM medication_doses WHERE mid = ? AND taken_at >= ? AND taken_at < ?'
    );
    $stmt->execute([
        (int)$mid,
        $today->format('Y-m-d H:i:s'),
        $today->modify('+1 day')->format('Y-m-d H:i:s')
    ]);
    $doses = $stmt->fetch();
    $count = (int)$doses['taken_count'];

    if (!(bool)$medication['as_needed'] && $count > 0) {
        $takenAt = $doses['taken_at'];
        $status = 200;
    } else {
        $takenAt = $now->format('Y-m-d H:i:s');
        $stmt = $pdo->prepare('INSERT INTO medication_doses (mid, taken_at) VALUES (?, ?)');
        $stmt->execute([(int)$mid, $takenAt]);
        $count++;
        $status = 201;
    }

    $pdo->commit();
    http_response_code($status);
    echo json_encode(['success' => true, 'taken_at' => $takenAt, 'taken_count' => $count]);
} catch (PDOException $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    error_log('Failed to record medication dose: ' . $e->getMessage());
    medicationTakenFail(500, 'Could not save medication dose');
}
