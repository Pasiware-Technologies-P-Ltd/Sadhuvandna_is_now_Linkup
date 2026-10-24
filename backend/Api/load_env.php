<?php
// Api/load_env.php
// Robust helper to load .env variables into getenv(), $_ENV and $_SERVER

function loadEnvFile($path = null) {
    if ($path === null) {
        $candidatePaths = [
            __DIR__ . '/.env',
            dirname(__DIR__) . '/.env',
            dirname(dirname(__DIR__)) . '/.env'
        ];
        foreach ($candidatePaths as $p) {
            if (file_exists($p)) {
                $path = $p;
                break;
            }
        }
    }

    if (!$path || !file_exists($path)) {
        return;
    }

    $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        $line = trim($line);
        // Skip comments
        if (empty($line) || $line[0] === '#' || strpos($line, '//') === 0) {
            continue;
        }

        if (strpos($line, '=') !== false) {
            list($name, $value) = explode('=', $line, 2);
            $name = trim($name);
            $value = trim($value);

            // Strip surrounding quotes if present
            if ((str_starts_with($value, '"') && str_ends_with($value, '"')) ||
                (str_starts_with($value, "'") && str_ends_with($value, "'"))) {
                $value = substr($value, 1, -1);
            }

            // Put into environment if not already set by system/container
            if (getenv($name) === false) {
                putenv("{$name}={$value}");
                $_ENV[$name] = $value;
                $_SERVER[$name] = $value;
            }
        }
    }
}

// Automatically load on include
loadEnvFile();
?>
