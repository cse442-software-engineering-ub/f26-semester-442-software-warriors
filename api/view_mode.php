<?php
require __DIR__ . '/cors.php';
require __DIR__ . '/db.php';
require __DIR__ . '/require_auth.php';

header('Content-Type: application/json');

$userId = requireAuth();

if($_SERVER['REQUEST_METHOD'] !== 'POST') {
    header('Allow: POST');
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed.']);
    exit;
}

if(empty($_SESSION['isCaregiver'])) {
    http_response_code(403);
    echo json_encode(['success' => false, 'error' => 'Only caregivers can switch modes.']);
    exit;
}

$data = json_decode(file_get_contents('php://input'), true);
$viewMode = is_array($data) ? ($data['viewMode'] ?? null) : null;

if(!in_array($viewMode, ['personal', 'caregiver'], true)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Invalid viewing mode.']);
    exit;
}

if($viewMode === 'caregiver') {
    $patientId = (int)($_SESSION['patientID'] ?? 0);

    $stmt = $pdo->prepare(
        'SELECT 1 FROM caregivers
         WHERE uid = ? AND caregiver_uid = ?
         LIMIT 1'
    );
    $stmt->execute([$patientId, $userId]);

    if($patientId <= 0 || !$stmt->fetchColumn()) {
        http_response_code(403);
        echo json_encode(['success' => false, 'error' => 'Patient access is unavailable.']);
        exit;
    }
}

$_SESSION['viewMode'] = $viewMode;

echo json_encode([
    'success' => true,
    'viewMode' => $viewMode
]);