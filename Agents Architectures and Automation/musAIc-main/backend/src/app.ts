import express from 'express';
import { clerkMiddleware } from '@clerk/express';
import apiRouter from './routes/api.js';
import handleGlobalErrors from './middleware/handleGlobalErrors.js';

const app = express();

app.use(express.json());
app.use(clerkMiddleware());

app.get('/healthcheck', (req, res) => {
  res.status(200).json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

app.use('/api', apiRouter);

app.use(handleGlobalErrors);

export default app;
