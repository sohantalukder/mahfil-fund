import Fastify from 'fastify';
import helmet from '@fastify/helmet';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import sensible from '@fastify/sensible';
import multipart from '@fastify/multipart';
import { loadEnv } from './shared/env.js';
import { requestContextPlugin } from './plugins/requestContext.js';
import { prismaPlugin } from './plugins/prisma.js';
import { requestMetadataPlugin } from './plugins/requestMetadata.js';
import { authPlugin } from './plugins/auth.js';
import { idempotencyPlugin } from './plugins/idempotency.js';
import { tenantGuardPlugin } from './plugins/tenantGuard.js';
import { initMailTransporter } from './services/mail.js';
import { registerRoutes } from './routes/index.js';
import { registerErrorHandler } from './routes/errorHandler.js';

export function buildApp() {
  const env = loadEnv();

  const app = Fastify({
    logger: {
      level: env.NODE_ENV === 'production' ? 'info' : 'debug'
    },
    trustProxy: env.TRUST_PROXY
  });

  app.decorate('env', env);

  app.register(helmet);
  app.register(cors, {
    origin: env.CORS_ORIGIN === '*' ? true : env.CORS_ORIGIN.split(',').map((s) => s.trim()),
    credentials: true,
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Community-Id',
      'X-Client',
      'X-Device-Id',
      'Idempotency-Key',
      'Accept',
      'Accept-Language',
    ],
  });
  app.register(rateLimit, { max: 250, timeWindow: '1 minute' });
  app.register(sensible);
  app.register(multipart, { limits: { fileSize: 10 * 1024 * 1024 } }); // 10 MB

  app.register(requestContextPlugin);
  app.register(prismaPlugin);
  app.register(requestMetadataPlugin);
  app.register(authPlugin);
  app.register(tenantGuardPlugin);
  app.register(idempotencyPlugin);

  initMailTransporter(env);

  registerErrorHandler(app);
  registerRoutes(app);

  return app;
}

declare module 'fastify' {
  interface FastifyInstance {
    env: ReturnType<typeof loadEnv>;
  }
}

