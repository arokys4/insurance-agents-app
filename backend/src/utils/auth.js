const crypto = require('crypto');

const TOKEN_TTL_SECONDS = 8 * 60 * 60;

function getAuthSecret() {
  return process.env.AUTH_SECRET || 'dev-secret-change-before-production';
}

function base64UrlEncode(value) {
  return Buffer.from(JSON.stringify(value)).toString('base64url');
}

function base64UrlDecode(value) {
  return JSON.parse(Buffer.from(value, 'base64url').toString('utf8'));
}

function sign(value) {
  return crypto
    .createHmac('sha256', getAuthSecret())
    .update(value)
    .digest('base64url');
}

function createAuthToken(user) {
  const header = base64UrlEncode({
    alg: 'HS256',
    typ: 'JWT'
  });

  const payload = base64UrlEncode({
    sub: user.id,
    email: user.email,
    role: user.role,
    exp: Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS
  });

  const unsignedToken = `${header}.${payload}`;

  return `${unsignedToken}.${sign(unsignedToken)}`;
}

function verifyAuthToken(token) {
  if (!token || typeof token !== 'string') {
    return null;
  }

  const parts = token.split('.');

  if (parts.length !== 3) {
    return null;
  }

  const [header, payload, signature] = parts;
  const unsignedToken = `${header}.${payload}`;
  const expectedSignature = sign(unsignedToken);

  if (
    signature.length !== expectedSignature.length ||
    !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))
  ) {
    return null;
  }

  const decodedPayload = base64UrlDecode(payload);

  if (!decodedPayload.exp || decodedPayload.exp < Math.floor(Date.now() / 1000)) {
    return null;
  }

  return {
    id: Number(decodedPayload.sub),
    email: decodedPayload.email,
    role: decodedPayload.role
  };
}

function requireAuth(req, res, next) {
  const authorizationHeader = req.headers.authorization || '';
  const [scheme, token] = authorizationHeader.split(' ');

  if (scheme !== 'Bearer') {
    return res.status(401).json({
      error: 'Brak aktywnej sesji użytkownika.'
    });
  }

  const user = verifyAuthToken(token);

  if (!user) {
    return res.status(401).json({
      error: 'Sesja wygasła lub jest nieprawidłowa.'
    });
  }

  req.user = user;
  return next();
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        error: 'Brak uprawnień do wykonania tej operacji.'
      });
    }

    return next();
  };
}

function requireAdmin(req, res, next) {
  return requireRole('ADMIN')(req, res, next);
}

module.exports = {
  createAuthToken,
  requireAuth,
  requireRole,
  requireAdmin
};
