import cors from 'cors';
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';

const fallbackOrigins = [
  'https://company.theonebranding.com',
  'https://theone-it-frontend.vercel.app',
  'http://localhost:5173',
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

const normalizeOrigin = (value) => {
  if (!value || typeof value !== 'string') {
    return null;
  }

  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
};

const resolveRequestOrigin = (req) => {
  const originHeader = normalizeOrigin(req.get('origin'));
  if (originHeader) {
    return originHeader;
  }

  return normalizeOrigin(req.get('referer'));
};

const DEFAULT_RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;

const parsePositiveInt = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const resolveWindowMs = (envKey, fallback = DEFAULT_RATE_LIMIT_WINDOW_MS) =>
  parsePositiveInt(process.env[envKey], fallback);

const resolveMax = (envKey, fallback) => parsePositiveInt(process.env[envKey], fallback);

const authIdentifierFromRequest = (req) => {
  const emailFromBody =
    typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : undefined;
  const emailFromQuery =
    typeof req.query?.email === 'string' ? req.query.email.trim().toLowerCase() : undefined;

  return emailFromBody || emailFromQuery || 'anonymous';
};

const authKeyGenerator = (req) => `${ipKeyGenerator(req.ip)}:${authIdentifierFromRequest(req)}`;
const sessionKeyGenerator = (req) => `${ipKeyGenerator(req.ip)}:${req.user?._id || 'anonymous'}`;

const resolveRetryAfterSeconds = (resetTime) => {
  if (!resetTime) {
    return undefined;
  }

  const resetAt = resetTime instanceof Date ? resetTime.getTime() : Number(resetTime);
  if (!Number.isFinite(resetAt)) {
    return undefined;
  }

  return Math.max(0, Math.ceil((resetAt - Date.now()) / 1000));
};

const createRateLimiter = ({ windowMs, max, message, keyGenerator, skipSuccessfulRequests = false }) =>
  rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      const response = { message };
      const retryAfterSeconds = resolveRetryAfterSeconds(req.rateLimit?.resetTime);

      if (retryAfterSeconds !== undefined) {
        response.retryAfterSeconds = retryAfterSeconds;
      }

      return res.status(429).json(response);
    },
    keyGenerator,
    skipSuccessfulRequests,
  });

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

export const globalApiLimiter = createRateLimiter({
  windowMs: resolveWindowMs('RATE_LIMIT_GLOBAL_WINDOW_MS'),
  max: resolveMax('RATE_LIMIT_GLOBAL_MAX', 300),
  message: 'Too many requests, please try again later.',
});

export const mutationApiLimiter = createRateLimiter({
  windowMs: resolveWindowMs('RATE_LIMIT_MUTATION_WINDOW_MS'),
  max: resolveMax('RATE_LIMIT_MUTATION_MAX', 120),
  message: 'Too many mutation requests, please try again later.',
});

export const bulkOperationLimiter = createRateLimiter({
  windowMs: resolveWindowMs('RATE_LIMIT_BULK_WINDOW_MS'),
  max: resolveMax('RATE_LIMIT_BULK_MAX', 20),
  message: 'Too many bulk operation requests, please try again later.',
});

export const authLimiter = createRateLimiter({
  windowMs: resolveWindowMs('RATE_LIMIT_AUTH_WINDOW_MS'),
  max: resolveMax('RATE_LIMIT_AUTH_MAX', 20),
  message: 'Too many authentication attempts, please try again later.',
  keyGenerator: authKeyGenerator,
  skipSuccessfulRequests: true,
});

export const strictAuthLimiter = createRateLimiter({
  windowMs: resolveWindowMs('RATE_LIMIT_STRICT_AUTH_WINDOW_MS'),
  max: resolveMax('RATE_LIMIT_STRICT_AUTH_MAX', 10),
  message: 'Too many attempts for this endpoint, please try again later.',
  keyGenerator: authKeyGenerator,
  skipSuccessfulRequests: true,
});

// Optional env controls: RATE_LIMIT_AUTH_BURST_WINDOW_MS and RATE_LIMIT_AUTH_BURST_MAX.
export const authBurstLimiter = createRateLimiter({
  windowMs: resolveWindowMs('RATE_LIMIT_AUTH_BURST_WINDOW_MS', 60 * 1000),
  max: resolveMax('RATE_LIMIT_AUTH_BURST_MAX', 5),
  message: 'Too many requests, please try again later.',
  keyGenerator: authKeyGenerator,
  skipSuccessfulRequests: true,
});

export const sessionReadLimiter = createRateLimiter({
  windowMs: resolveWindowMs('RATE_LIMIT_SESSION_READ_WINDOW_MS'),
  max: resolveMax('RATE_LIMIT_SESSION_READ_MAX', 80),
  message: 'Too many session read requests, please try again later.',
  keyGenerator: sessionKeyGenerator,
});

export const sessionMutationLimiter = createRateLimiter({
  windowMs: resolveWindowMs('RATE_LIMIT_SESSION_MUTATION_WINDOW_MS'),
  max: resolveMax('RATE_LIMIT_SESSION_MUTATION_MAX', 25),
  message: 'Too many session mutation requests, please try again later.',
  keyGenerator: sessionKeyGenerator,
});

export const createCookieOriginGuard = ({ allowNoOrigin = true } = {}) => (req, res, next) => {
  const requestOrigin = resolveRequestOrigin(req);

  if (!requestOrigin) {
    if (allowNoOrigin) {
      return next();
    }

    return res.status(403).json({ message: 'Origin header is required for this endpoint' });
  }

  if (!isOriginAllowed(requestOrigin)) {
    return res.status(403).json({ message: 'Origin not allowed' });
  }

  return next();
};

export const corsMiddleware = cors(corsOptions);
