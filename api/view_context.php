<?php

function getViewingContext(PDO $pdo, int $userId): array {
    $isCaregiver = !empty($_SESSION['isCaregiver']);
    $viewMode = $isCaregiver ? ($_SESSION['viewMode'] ?? 'caregiver') : 'personal';

    if(!$isCaregiver || $viewMode === 'personal') {
        return [
            'uid' => $userId,
            'isPatientView' => false
        ];
    }
    $patientId = (int)($_SESSION['patientID'] ?? 0);

    if($patientId <= 0) {
        http_response_code(403);
        header('Content-Type: application/json');
        echo json_encode(['error' => 'Patient access is unavailable.']);
        exit;
    }

    $stmt = $pdo->prepare(
        'SELECT 1 FROM caregivers 
        WHERE uid = ? AND caregiver_uid = ? 
        LIMIT 1'
    );
    $stmt->execute([$patientId, $userId]);

    if(!$stmt->fetchColumn()) {
        http_response_code(403);
        header('Content-Type: application/json');
        echo json_encode(['error' => 'You no longer have access to this patient.']);
        exit;
    }

    return [
        'uid' => $patientId,
        'isPatientView' => true
    ];
}