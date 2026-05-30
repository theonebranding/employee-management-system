import cors from 'cors';
import rateLimit from 'express-rate-limit';

const fallbackOrigins = [
  'https://company.theonebranding.com',
  'https://theone-it-frontend.vercel.app',
  'http://localhost:5173',
  'http://localhost:5174',
];

const parseOriginsFromEnv = () => {
  const envValue = process.env.CORS_ORIGINS || process.env.CORS_ORIGIN;
  if (!envValue) {
    return fallbackOrigins;
  }

  const origins = envValue
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  return origins.length ? origins : fallbackOrigins;
};

const isOriginAllowed = (origin) => {
  const allowedOrigins = parseOriginsFromEnv();
  return allowedOrigins.includes(origin);
};

export const corsOptions = {
  origin: (origin, callback) => {
    if (!origin || isOriginAllowed(origin)) {
      return callback(null, true);
    }

    return callback(new Error('CORS policy violation'));
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['RateLimit-Limit', 'RateLimit-Remaining', 'RateLimit-Reset'],
  credentials: true,
  optionsSuccessStatus: 204,
  maxAge: 60 * 60,
  preflightContinue: false,
};

export const globalApiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many requests, please try again later.' },
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many authentication attempts, please try again later.' },
});

export const strictAuthLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many attempts for this endpoint, please try again later.' },
});

export const corsMiddleware = cors(corsOptions);
