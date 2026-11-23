<?php
require __DIR__ . '/cors.php';
require __DIR__ . '/db.php';
require __DIR__ . '/require_auth.php';

header('Content-Type: application/json');

function permissionsFail(int $status, string $message): void {
    http_response_code($status);
    echo json_encode(['success' => false, 'error' => $message]);
    exit;
}

$userId = requireAuth();
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    header('Allow: POST');
    permissionsFail(405, 'Method not allowed.');
}

if (empty($_SESSION['isCaregiver'])) {
    permissionsFail(403, 'Only caregivers can update permissions.');
}

$patientId = (int)($_SESSION['patientID'] ?? 0);
if ($patientId <= 0) {
    permissionsFail(403, 'Patient access is unavailable.');
}

$data = json_decode(file_get_contents('php://input'), true);
$fields = ['can_edit_medications', 'can_edit_appointments', 'can_view_medication_history'];
if (!is_array($data)) {
    permissionsFail(400, 'Invalid permissions.');
}
foreach ($fields as $field) {
    if (!array_key_exists($field, $data) || !is_bool($data[$field])) {
        permissionsFail(400, 'All permissions must be boolean values.');
    }
}

try {
    $pdo->beginTransaction();

    // Serialize first-time inserts for this patient, even if pid is not indexed uniquely.
    $stmt = $pdo->prepare('SELECT id FROM users WHERE id = ? FOR UPDATE');
    $stmt->execute([$patientId]);
    if (!$stmt->fetchColumn()) {
        $pdo->rollBack();
        permissionsFail(403, 'Patient access is unavailable.');
    }

    $stmt = $pdo->prepare('SELECT cid FROM caregivers WHERE uid = ? AND caregiver_uid = ? LIMIT 1 FOR UPDATE');
    $stmt->execute([$patientId, $userId]);
    if (!$stmt->fetchColumn()) {
        $pdo->rollBack();
        permissionsFail(403, 'Patient access is unavailable.');
    }

    $stmt = $pdo->prepare('SELECT pid FROM patient_permissions WHERE pid = ?');
    $stmt->execute([$patientId]);
    if ($stmt->fetchColumn() !== false) {
        $stmt = $pdo->prepare(
            'UPDATE patient_permissions
             SET can_edit_medications = ?, can_edit_appointments = ?, can_view_medication_history = ?, updated_at = NOW()
             WHERE pid = ?'
        );
        $stmt->execute([
            (int)$data['can_edit_medications'],
            (int)$data['can_edit_appointments'],
            (int)$data['can_view_medication_history'],
            $patientId,
        ]);
    } else {
        $stmt = $pdo->prepare(
            'INSERT INTO patient_permissions
             (pid, can_edit_medications, can_edit_appointments, can_view_medication_history, updated_at)
             VALUES (?, ?, ?, ?, NOW())'
        );
        $stmt->execute([
            $patientId,
            (int)$data['can_edit_medications'],
            (int)$data['can_edit_appointments'],
            (int)$data['can_view_medication_history'],
        ]);
    }
    $pdo->commit();
} catch (PDOException $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    error_log('Failed to update patient permissions: ' . $e->getMessage());
    permissionsFail(500, 'Could not save permissions.');
}

echo json_encode(['success' => true]);
