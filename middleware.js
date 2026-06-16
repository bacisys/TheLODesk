import { next } from '@vercel/edge';
import { createRemoteJWKSet, jwtVerify } from 'jose';

// Run this check on every request to the deployment.
export const config = {
  matcher: '/:path*',
};

// Your Cloudflare Access team domain and the application's AUD tag.
// Set CF_ACCESS_AUD in Vercel -> Settings -> Environment Variables.
const TEAM_DOMAIN =
  process.env.CF_ACCESS_TEAM_DOMAIN || 'bacisys.cloudflareaccess.com';
const AUD = process.env.CF_ACCESS_AUD;

// Cloudflare publishes the public keys it signs Access tokens with here.
const JWKS = createRemoteJWKSet(
  new URL(`https://${TEAM_DOMAIN}/cdn-cgi/access/certs`)
);

export default async function middleware(request) {
  // Cloudflare Access injects this header on every request it forwards to
  // the origin after a user authenticates. A direct hit on the *.vercel.app
  // URL bypasses Cloudflare, so it won't carry a valid token.
  const token =
    request.headers.get('cf-access-jwt-assertion') ||
    readCookie(request, 'CF_Authorization');

  if (!token || !AUD) return deny();

  try {
    await jwtVerify(token, JWKS, {
      issuer: `https://${TEAM_DOMAIN}`,
      audience: AUD,
    });
    return next(); // Valid Access token — serve the site.
  } catch {
    return deny();
  }
}

function deny() {
  return new Response(
    'Forbidden. This site is only reachable through https://thelodesk.com.',
    { status: 403, headers: { 'content-type': 'text/plain' } }
  );
}

function readCookie(request, name) {
  const header = request.headers.get('cookie');
  if (!header) return null;
  const m = header.match(new RegExp('(?:^|;\\s*)' + name + '=([^;]+)'));
  return m ? decodeURIComponent(m[1]) : null;
}
