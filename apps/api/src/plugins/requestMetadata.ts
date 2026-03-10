import type { FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';

declare module 'fastify' {
  interface FastifyRequest {
    getOrCreateRequestMetaId: () => Promise<string>;
  }
}

function detectDeviceType(userAgent?: string): string | undefined {
  if (!userAgent) return undefined;
  const ua = userAgent.toLowerCase();
  if (ua.includes('android') || ua.includes('iphone') || ua.includes('ipad')) return 'mobile';
  return 'web';
}

export const requestMetadataPlugin: FastifyPluginAsync = fp(async (app) => {
  app.addHook('onRequest', async (req) => {
    let metaId: string | undefined;

    req.getOrCreateRequestMetaId = async () => {
      if (metaId) return metaId;

      const userAgent = req.headers['user-agent'];
      const client = typeof req.headers['x-client'] === 'string' ? req.headers['x-client'] : undefined;
      const deviceId = typeof req.headers['x-device-id'] === 'string' ? req.headers['x-device-id'] : undefined;

      // Fastify's req.ip respects trustProxy; this is the canonical source here.
      const ip = req.ip;

      const created = await app.prisma.requestMetadata.create({
        data: {
          ip,
          userAgent,
          deviceType: detectDeviceType(userAgent),
          client,
          deviceId
        }
      });

      metaId = created.id;
      return metaId;
    };
  });
});

