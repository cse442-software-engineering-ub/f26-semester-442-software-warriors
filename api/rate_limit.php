<?php
// Counts recent actions in the rate_limits table (database/rate_limits.sql), so nobody can guess
// passwords forever or make our Gmail send unlimited emails.
// The key (an email or a user id) is stored as a hash, never as plain text.
// If the table is missing, it logs the problem and lets the request through, so nothing breaks.

function rateKey(string $key): string
{
    return hash('sha256', strtolower(trim($key)));
}

// true when $key already did $action $max times in the last $minutes
function tooManyAttempts(PDO $pdo, string $action, string $key, int $max, int $minutes): bool
{
    try {
        $stmt = $pdo->prepare(
            'SELECT COUNT(*) FROM rate_limits
             WHERE action = ? AND key_hash = ? AND created_at > NOW() - INTERVAL ? MINUTE'
        );
        $stmt->execute([$action, rateKey($key), $minutes]);
        return (int)$stmt->fetchColumn() >= $max;
    } catch (PDOException $e) {
        error_log('rate_limit.php: ' . $e->getMessage());
        return false;
    }
}

function recordAttempt(PDO $pdo, string $action, string $key): void
{
    try {
        $pdo->prepare('INSERT INTO rate_limits (action, key_hash) VALUES (?, ?)')
            ->execute([$action, rateKey($key)]);
        // Now and then, remove rows older than a day so the table stays small
        if (random_int(1, 50) === 1) {
            $pdo->exec('DELETE FROM rate_limits WHERE created_at < NOW() - INTERVAL 1 DAY');
        }
    } catch (PDOException $e) {
        error_log('rate_limit.php: ' . $e->getMessage());
    }
}

function clearAttempts(PDO $pdo, string $action, string $key): void
{
    try {
        $pdo->prepare('DELETE FROM rate_limits WHERE action = ? AND key_hash = ?')
            ->execute([$action, rateKey($key)]);
    } catch (PDOException $e) {
        error_log('rate_limit.php: ' . $e->getMessage());
    }
}
