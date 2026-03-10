import { buildApp } from './app.js';

const app = buildApp();

const port = app.env.PORT;
const host = '0.0.0.0';

app.listen({ port, host }).catch((err) => {
  app.log.error(err, 'Failed to start server');
  process.exit(1);
});

