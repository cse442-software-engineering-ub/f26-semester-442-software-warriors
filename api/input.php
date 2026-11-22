<?php
// Reads one text field from $_POST, $_GET or decoded JSON.
// A list (name[]=x) or an object counts as empty instead of crashing trim() with a 500.
function textInput($source, string $key): string
{
    if (!is_array($source)) {
        return '';
    }
    $value = $source[$key] ?? '';
    if (is_string($value) || is_int($value) || is_float($value)) {
        return trim((string)$value);
    }
    return '';
}

// Safety net: any error nobody caught (a database error, a bug) becomes a plain JSON 500.
// The details go to the server's error log, never to the browser (no file paths or SQL).
set_exception_handler(function (Throwable $e): void {
    error_log(basename($_SERVER['SCRIPT_NAME'] ?? 'api') . ': ' . get_class($e) . ': ' . $e->getMessage()
        . ' in ' . $e->getFile() . ':' . $e->getLine());
    if (!headers_sent()) {
        http_response_code(500);
        header('Content-Type: application/json');
    }
    echo json_encode(['error' => 'Something went wrong. Please try again later.']);
});
