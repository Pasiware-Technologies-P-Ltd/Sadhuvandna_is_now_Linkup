<?php
// RedisConfig.php
class RedisConfig {
    private static $instance = null;

    public static function getConnection() {
        if (self::$instance !== null) {
            try {
                if (@self::$instance->ping()) {
                    return self::$instance;
                }
            } catch (Throwable $e) {
                self::$instance = null;
            }
        }

        try {
            if (!extension_loaded('redis')) {
                error_log("Redis extension is not loaded in PHP.");
                return null;
            }

            $redis = new Redis();
            $host = getenv('REDIS_HOST') ?: "127.0.0.1";
            $port = (int)(getenv('REDIS_PORT') ?: 6379);
            $pass = getenv('REDIS_PASSWORD') ?: getenv('REDIS_PASS') ?: getenv('REDIS_AUTH') ?: null;

            // Support REDIS_URL like redis://:password@host:port or redis://user:password@host:port
            $redisUrl = getenv('REDIS_URL');
            if (!empty($redisUrl)) {
                $parsed = parse_url($redisUrl);
                if (!empty($parsed['host'])) $host = $parsed['host'];
                if (!empty($parsed['port'])) $port = (int)$parsed['port'];
                if (!empty($parsed['pass'])) $pass = $parsed['pass'];
            }

            // Connect with timeout
            if (!$redis->connect($host, $port, 2.5)) {
                throw new Exception("Could not connect to Redis at $host:$port");
            }

            // Authenticate if password is provided
            if (!empty($pass)) {
                if (!$redis->auth($pass)) {
                    throw new Exception("Redis authentication failed with provided password.");
                }
            }

            // Test ping to verify auth and responsiveness
            if (!@$redis->ping()) {
                throw new Exception("Redis ping failed or requires authentication.");
            }

            // Prefix all keys to avoid conflicts with other apps on the same Redis
            $redis->setOption(Redis::OPT_PREFIX, 'bs_queue:');

            self::$instance = $redis;
            return self::$instance;
        } catch (Throwable $e) {
            error_log("Redis connection error: " . $e->getMessage());
            self::$instance = null;
            return null;
        }
    }
}
?>
