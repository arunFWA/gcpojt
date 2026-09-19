import { createApp } from './app';

// GCP Cloud Run injects PORT; local dev defaults to 3000.
const PORT = Number(process.env.PORT) || 3000;

const app = createApp();

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`StoreOps API listening on port ${PORT}`);
});
