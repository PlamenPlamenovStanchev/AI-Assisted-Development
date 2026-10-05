import { Worker } from 'node:worker_threads';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
// Share one worker across route bundles and development hot reloads.
function connection() {
  if (globalThis.__todaiDB) return globalThis.__todaiDB;
  const worker = new Worker(pathToFileURL(resolve(process.cwd(), 'lib/db-worker.mjs')), { workerData: { filename: process.env.TODAI_DB_PATH || resolve('data/todai.sqlite') } });
  const pending = new Map(); let sequence = 0;
  const fail = (error) => { for (const { reject } of pending.values()) reject(error); pending.clear(); globalThis.__todaiDB = null; };
  worker.on('error', fail);
  worker.on('exit', () => fail(new Error('Database worker stopped.')));
  worker.on('message', ({ key, result, error, status }) => {
    const request = pending.get(key); if (!request) return;
    pending.delete(key);
    if (error) request.reject(Object.assign(new Error(error), { status })); else request.resolve(result);
  });
  worker.unref();
  return globalThis.__todaiDB = (action, payload) => new Promise((resolve, reject) => {
    if (pending.size >= 200) return reject(Object.assign(new Error('A lot is happening. Please try again in a moment.'), { status: 503 }));
    const key = ++sequence; pending.set(key, { resolve, reject }); worker.postMessage({ key, action, payload });
  });
}
export const queryDB = (action, payload) => connection()(action, payload);
