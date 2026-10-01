import type { FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';
import { createHmac } from 'node:crypto';

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

function boundedHeader(value: string | string[] | undefined, max: number): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value.slice(0, max) : undefined;
}

export const requestMetadataPlugin: FastifyPluginAsync = fp(async (app) => {
  app.addHook('onRequest', async (req) => {
    let metaId: string | undefined;

    req.getOrCreateRequestMetaId = async () => {
      if (metaId) return metaId;

      const userAgent = boundedHeader(req.headers['user-agent'], 500);
      const client = boundedHeader(req.headers['x-client'], 32);
      const rawDeviceId = boundedHeader(req.headers['x-device-id'], 200);
      const deviceId = rawDeviceId
        ? createHmac('sha256', app.env.JWT_SECRET).update(rawDeviceId).digest('hex')
        : undefined;

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
