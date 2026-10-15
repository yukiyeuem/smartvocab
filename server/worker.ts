// Cloudflare Worker entry point for Cloudflare Workers Builds & Wrangler Deploy
// Handles /api/* requests with native D1 and passes static assets to ASSETS binding.
import { onRequest } from '../functions/api/[[route]]';

export interface Env {
  DB: any;
  ASSETS?: { fetch: (request: Request) => Promise<Response> };
  GEMINI_API_KEY?: string;
  ADMIN_EMAIL?: string;
  [key: string]: any;
}

export default {
  async fetch(request: Request, env: Env, ctx: any): Promise<Response> {
    const url = new URL(request.url);

    // Route /api/* requests to the D1 & Gemini API handler
    if (url.pathname.startsWith('/api/') || url.pathname === '/api') {
      const routeParts = url.pathname.replace(/^\/api\/?/, '').split('/').filter(Boolean);
      return onRequest({
        request,
        env: env as any,
        params: { route: routeParts },
        next: async () => new Response(JSON.stringify({ error: 'Endpoint not found' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        }),
      } as any);
    }

    // Pass all static assets and SPA routes to the ASSETS binding
    if (env.ASSETS && typeof env.ASSETS.fetch === 'function') {
      return env.ASSETS.fetch(request);
    }

    return new Response('Not Found', { status: 404 });
  },
};
