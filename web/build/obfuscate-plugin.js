/**
 * Vite plugin for obfuscating easter egg commands
 * 
 * Uses git commit hash as XOR key to encode hidden command triggers.
 * The hash is displayed as version info, hiding in plain sight.
 */

const { execSync } = require('child_process');

/**
 * XOR encode a string using a key
 * Returns comma-separated char codes for obfuscation
 */
function xorEncode(str, key) {
  return Array.from(str)
    .map((char, i) => char.charCodeAt(0) ^ key.charCodeAt(i % key.length))
    .join(',');
}

/**
 * Get git info for build
 */
function getGitInfo() {
  try {
    const hash = execSync('git rev-parse --short HEAD', { encoding: 'utf-8' }).trim();
    const version = execSync('git describe --tags --always', { encoding: 'utf-8' }).trim();
    const branch = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf-8' }).trim();
    return { hash, version, branch };
  } catch (e) {
    // Fallback for environments without git (like some CI)
    const fallbackHash = Date.now().toString(36).slice(-7);
    return { 
      hash: fallbackHash, 
      version: `dev-${fallbackHash}`,
      branch: 'unknown'
    };
  }
}

/**
 * Hidden commands configuration
 * Maps trigger -> game identifier
 * 
 * NOTE: These are encoded at build time. The actual strings
 * never appear in the production bundle.
 * 
 * The action values are game IDs that map to Z-machine story files
 * in the GAMES registry (see useZMachine.ts)
 */
const HIDDEN_COMMANDS = [
  { trigger: 'xyzzy', action: 'zork1' },  // Classic IF magic word
  { trigger: 'plugh', action: 'zork1' },  // Another classic IF magic word
  // Future games can be added here with different triggers
  // { trigger: 'frotz', action: 'zork2' },
];

/**
 * Vite plugin that injects obfuscated easter egg triggers
 */
function obfuscatePlugin() {
  const git = getGitInfo();
  
  // Pre-encode all hidden commands using commit hash as key
  const encodedTriggers = {};
  HIDDEN_COMMANDS.forEach(({ trigger, action }) => {
    const encoded = xorEncode(trigger, git.hash);
    encodedTriggers[encoded] = action;
  });
  
  // Also encode the response marker prefix
  const responsePrefix = xorEncode('__Z__', git.hash);
  
  console.log(` Easter Eggs • Encoded ${HIDDEN_COMMANDS.length} triggers with hash ${git.hash}`);
  
  return {
    name: 'obfuscate-easter-eggs',
    
    config() {
      return {
        define: {
          __BUILD_HASH__: JSON.stringify(git.hash),
          __BUILD_VERSION__: JSON.stringify(git.version),
          __BUILD_BRANCH__: JSON.stringify(git.branch),
          __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
          __ENCODED_TRIGGERS__: JSON.stringify(encodedTriggers),
          __RESPONSE_PREFIX__: JSON.stringify(responsePrefix),
        }
      };
    }
  };
}

module.exports = { obfuscatePlugin, xorEncode, getGitInfo };

