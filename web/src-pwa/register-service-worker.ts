import { register } from 'register-service-worker';

register(process.env.SERVICE_WORKER_FILE, {
  ready() {},
  registered() {},
  cached() {},
  updatefound() {},
  updated() {},
  offline() {},
  error() {},
});
