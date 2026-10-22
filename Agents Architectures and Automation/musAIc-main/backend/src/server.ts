import app from './app.js';

const PORT = Number(process.env.PORT ?? 3030);

app.listen(PORT, () => {
  console.log(`musAIc backend listening on http://localhost:${PORT}`);
});
