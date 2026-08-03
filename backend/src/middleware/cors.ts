import { CorsOptions } from 'cors';
import { env } from '../config/env';
import { ApiError } from '../utils/apiError';

const allowedOrigins = new Set([
  env.STOREFRONT_URL,
  env.VENDOR_DASHBOARD_URL,
  env.ADMIN_DASHBOARD_URL,
]);

export const corsOptions: CorsOptions = {
  origin(origin, callback) {
    // Native apps, server-to-server clients, health probes, and curl do not send
    // Origin. Their authorization is enforced independently of browser CORS.
    if (!origin || allowedOrigins.has(origin)) {
      callback(null, true);
      return;
    }

    callback(ApiError.forbidden('Origin is not allowed'));
  },
  credentials: true,
  methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Accept',
    'Authorization',
    'Content-Type',
    'Sec-Fetch-Site',
    'X-Auth-Mode',
    'X-CSRF-Token',
  ],
  exposedHeaders: ['X-CSRF-Token', 'X-CSRF-Error'],
  maxAge: 600,
  optionsSuccessStatus: 204,
};
