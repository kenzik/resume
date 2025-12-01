/**
 * Build-time injected globals for easter egg obfuscation
 * 
 * These are defined by the obfuscate-plugin at build time.
 * The commit hash serves as both version display and XOR key.
 */

/** Short git commit hash (e.g., "a1b2c3d") */
declare const __BUILD_HASH__: string;

/** Git version tag or describe output (e.g., "v1.2.3" or "v1.2.3-5-ga1b2c3d") */
declare const __BUILD_VERSION__: string;

/** Git branch name */
declare const __BUILD_BRANCH__: string;

/** ISO timestamp of build */
declare const __BUILD_TIME__: string;

/** 
 * Map of XOR-encoded command triggers to action identifiers
 * Keys are comma-separated char codes, values are action names
 */
declare const __ENCODED_TRIGGERS__: Record<string, string>;

/** XOR-encoded response prefix (decodes to "__Z__") */
declare const __RESPONSE_PREFIX__: string;

