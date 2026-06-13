import { register } from 'register-service-worker';
import { STORAGE_KEYS } from '../src/constants/index';

register(process.env.SERVICE_WORKER_FILE, {
  ready() {},
  registered() {},
  cached() {},
  updatefound() {},

  // §10 Offline Doctrine: the only user-visible update signal is a single
  // MOTD-style terminal line on the next visit (§3 F-tier — no toast, no
  // banner, no refresh button). Set a localStorage flag here; useMotd picks
  // it up on terminal startup and clears it immediately after showing it once.
  updated() {
    localStorage.setItem(STORAGE_KEYS.pwaUpdatePending, '1');
  },

  offline() {},
  error() {},
});
