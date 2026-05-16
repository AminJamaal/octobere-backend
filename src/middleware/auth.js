import jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';
import { config } from '../config.js';

const client = jwksClient({
  jwksUri: `https://${config.auth0.domain}/.well-known/jwks.json`,
  cache: true,
  rateLimit: true,
});

const DEV_BYPASS_TOKEN = 'octobere-dev-bypass-token-2026';

const DEV_USER = {
  sub: '00000000-0000-0000-0000-000000000001',
  email: 'admin@octobere.com',
  'https://api.octobere.com/roles': ['superadmin'],
  'https://api.octobere.com/email': 'admin@octobere.com',
};

function getKey(header, callback) {
  client.getSigningKey(header.kid, (err, key) => {
    if (err) return callback(err);
    const signingKey = key.getPublicKey();
    callback(null, signingKey);
  });
}

function handleDevBypass(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid Authorization header' });
  }
  const token = authHeader.split(' ')[1];

  if (config.nodeEnv === 'development' && token === DEV_BYPASS_TOKEN) {
    req.user = {
      id: DEV_USER.sub,
      email: DEV_USER['https://api.octobere.com/email'],
      roles: DEV_USER['https://api.octobere.com/roles'],
    };
    return next();
  }

  jwt.verify(token, getKey, {
    audience: config.auth0.audience,
    issuer: config.auth0.issuer || `https://${config.auth0.domain}/`,
    algorithms: ['RS256'],
  }, (err, decoded) => {
    if (err) {
      return res.status(401).json({ error: 'Invalid or expired token', detail: err.message });
    }
    req.user = {
      id: decoded.sub,
      email: decoded.email || decoded['https://api.octobere.com/email'] || '',
      roles: decoded['https://api.octobere.com/roles'] || [],
    };
    next();
  });
}

export function requireAuth(req, res, next) {
  handleDevBypass(req, res, next);
}

export function requireRole(...roles) {
  return (req, res, next) => {
    const userRoles = req.user?.roles || [];
    const hasRole = roles.some(r => userRoles.includes(r));
    if (!hasRole) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
}

export function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    req.user = null;
    return next();
  }

  const token = authHeader.split(' ')[1];

  if (config.nodeEnv === 'development' && token === DEV_BYPASS_TOKEN) {
    req.user = {
      id: DEV_USER.sub,
      email: DEV_USER['https://api.octobere.com/email'],
      roles: DEV_USER['https://api.octobere.com/roles'],
    };
    return next();
  }

  jwt.verify(token, getKey, {
    audience: config.auth0.audience,
    issuer: config.auth0.issuer || `https://${config.auth0.domain}/`,
    algorithms: ['RS256'],
  }, (err, decoded) => {
    if (err) {
      req.user = null;
    } else {
      req.user = {
        id: decoded.sub,
        email: decoded.email || '',
        roles: decoded['https://api.octobere.com/roles'] || [],
      };
    }
    next();
  });
}
