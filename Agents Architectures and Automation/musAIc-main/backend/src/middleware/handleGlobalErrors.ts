import type { ErrorRequestHandler } from 'express';

// Express recognizes error handlers by their 4-argument signature, so `next` must stay.
const handleGlobalErrors: ErrorRequestHandler = (err: unknown, req, res, next) => {
  if (!(err instanceof Error) || !('status' in err) || typeof err.status !== 'number') {
    console.error(err);
    res.status(500).json({ error: 'Internal Server Error' });
    return;
  }

  res.status(err.status).json({ error: err.message });
};

export default handleGlobalErrors;
