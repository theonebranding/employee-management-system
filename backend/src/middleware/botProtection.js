const defaultHoneypotFields = ['website', 'faxNumber', 'middleName'];

const hasNonEmptyValue = (value) => {
  if (typeof value === 'string') {
    return value.trim().length > 0;
  }

  if (Array.isArray(value)) {
    return value.length > 0;
  }

  return value !== undefined && value !== null && value !== false;
};

export const botProtection = (options = {}) => {
  const honeypotFields = Array.isArray(options.honeypotFields)
    ? options.honeypotFields
    : defaultHoneypotFields;

  return (req, res, next) => {
    const payload = req.body && typeof req.body === 'object' ? req.body : {};

    for (const fieldName of honeypotFields) {
      if (hasNonEmptyValue(payload[fieldName])) {
        return res.status(400).json({ message: 'Invalid request payload.' });
      }
    }

    const userAgent = req.get('user-agent');
    if (!userAgent || !userAgent.trim()) {
      return res.status(400).json({ message: 'User-Agent header is required.' });
    }

    const configuredToken = process.env.BOT_PROTECTION_TOKEN;
    const requireToken = Boolean(configuredToken) || options.requireToken === true;

    if (!requireToken) {
      return next();
    }

    const tokenFromHeader = req.get('x-bot-token');
    if (!tokenFromHeader) {
      return res.status(403).json({ message: 'Bot token is required.' });
    }

    const expectedToken = options.token || configuredToken;
    if (expectedToken && tokenFromHeader !== expectedToken) {
      return res.status(403).json({ message: 'Invalid bot token.' });
    }

    return next();
  };
};

export default botProtection;
