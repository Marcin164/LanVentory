import { initBaseAuth } from '@propelauth/node';

const url = process.env.PROPELAUTH_AUTH_URL;
const key = process.env.PROPELAUTH_API_KEY;

if (!url || !key) {
  throw new Error(
    'PROPELAUTH_AUTH_URL and PROPELAUTH_API_KEY must be set in env',
  );
}

/**
 * Single PropelAuth client shared across guards / services. Initializes
 * from env and surfaces only the verbs the codebase needs. Centralised
 * so a compromised key requires editing one place.
 */
export const propelAuth = initBaseAuth({
  authUrl: url,
  apiKey: key,
});

export const { validateAccessTokenAndGetUserClass, logoutAllUserSessions } =
  propelAuth;
