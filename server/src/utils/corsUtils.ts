import { CorsOptions } from 'cors';

/**
 * Parses comma-separated client URLs and strips any trailing slashes.
 */
export const parseAllowedOrigins = (clientUrlEnv?: string): string[] => {
  if (!clientUrlEnv) return [];
  return clientUrlEnv
    .split(',')
    .map((url) => url.trim().replace(/\/+$/, ''))
    .filter(Boolean);
};

/**
 * Checks if a given incoming request origin is allowed based on CLIENT_URL environment variable.
 * Supports exact domain matches, trailing slash normalization, and Vercel preview subdomains (*.vercel.app).
 */
export const isOriginAllowed = (origin: string | undefined): boolean => {
  // Allow requests with no origin (such as mobile apps, cURL, Postman)
  if (!origin) return true;

  const clientUrlEnv = process.env.CLIENT_URL;
  // If CLIENT_URL is not set or set to wildcard '*', allow all origins
  if (!clientUrlEnv || clientUrlEnv.trim() === '*') return true;

  const allowedOrigins = parseAllowedOrigins(clientUrlEnv);
  const normalizedOrigin = origin.trim().replace(/\/+$/, '');

  // 1. Direct exact match
  if (allowedOrigins.includes('*') || allowedOrigins.includes(normalizedOrigin)) {
    return true;
  }

  // 2. Allow any *.vercel.app deployment preview if an allowed origin is a vercel.app domain
  const hasVercelOrigin = allowedOrigins.some((url) => url.endsWith('.vercel.app'));
  if (hasVercelOrigin && (normalizedOrigin.endsWith('.vercel.app') || normalizedOrigin.includes('.vercel.app'))) {
    return true;
  }

  return false;
};

/**
 * Express CORS options configuration with origin normalization.
 */
export const corsOptions: CorsOptions = {
  origin: (origin, callback) => {
    if (isOriginAllowed(origin)) {
      return callback(null, true);
    }
    return callback(new Error(`CORS policy error: Origin ${origin} is not allowed.`));
  },
  credentials: true,
};
