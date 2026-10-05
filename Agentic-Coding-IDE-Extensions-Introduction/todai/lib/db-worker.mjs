import { parentPort, workerData } from 'node:worker_threads';
import { createStore } from './store.mjs';
const store = createStore(workerData.filename);
parentPort.on('message', ({ key, action, payload }) => {
  try { parentPort.postMessage({ key, result: store.dispatch(action, payload) }); }
  catch (error) { parentPort.postMessage({ key, error: error.status ? error.message : 'Storage is temporarily unavailable. Please try again.', status: error.status || 500 }); if (!error.status) console.error(error); }
});
