const resolveCaptchaEndpoint = (provider) => {
  if (provider === 'turnstile') {
    return 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
  }

  if (provider === 'recaptcha') {
    return 'https://www.google.com/recaptcha/api/siteverify';
  }

  return undefined;
};

const resolveRemoteIp = (req) => {
  const forwardedFor = req.get('x-forwarded-for');
  if (typeof forwardedFor === 'string' && forwardedFor.trim().length > 0) {
    return forwardedFor.split(',')[0].trim();
  }

  return req.ip;
};

export const captchaProtection = (options = {}) => {
  // Optional env controls: CAPTCHA_PROVIDER=turnstile|recaptcha and CAPTCHA_SECRET_KEY.
  const provider = (options.provider || process.env.CAPTCHA_PROVIDER || '').trim().toLowerCase();
  const secretKey = (options.secretKey || process.env.CAPTCHA_SECRET_KEY || '').trim();
  const requireCaptcha = options.requireCaptcha === true;

  return async (req, res, next) => {
    if ((!provider || !secretKey) && !requireCaptcha) {
      return next();
    }

    const tokenFromHeader = req.get('x-captcha-token');
    const tokenFromBody =
      typeof req.body?.captchaToken === 'string' ? req.body.captchaToken.trim() : undefined;
    const captchaToken = (tokenFromHeader || tokenFromBody || '').trim();

    if (!captchaToken) {
      return res.status(400).json({ message: 'Captcha token is required.' });
    }

    const endpoint = resolveCaptchaEndpoint(provider);
    if (!endpoint || !secretKey) {
      return res.status(503).json({ message: 'Captcha service unavailable.' });
    }

    const requestBody = new URLSearchParams();
    requestBody.set('secret', secretKey);
    requestBody.set('response', captchaToken);

    const remoteIp = resolveRemoteIp(req);
    if (remoteIp) {
      requestBody.set('remoteip', remoteIp);
    }

    try {
      const verificationResponse = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: requestBody,
      });

      if (!verificationResponse.ok) {
        throw new Error('Captcha verification request failed');
      }

      const verificationResult = await verificationResponse.json();
      if (verificationResult?.success !== true) {
        return res.status(403).json({ message: 'Captcha verification failed.' });
      }

      return next();
    } catch {
      return res.status(503).json({ message: 'Captcha service unavailable.' });
    }
  };
};

export default captchaProtection;
