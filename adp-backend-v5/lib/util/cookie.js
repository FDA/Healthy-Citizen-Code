function getCookieSameSite(sameSite) {
  const sameSiteVal = (sameSite || '').toLowerCase();
  if (['true', 'false'].includes(sameSite)) {
    return JSON.parse(sameSite);
  }
  if (['lax', 'strict', 'none'].includes(sameSiteVal)) {
    return sameSiteVal;
  }
  return 'strict';
}

module.exports = {
  cookieOpts: {
    signed: !!process.env.COOKIE_SECRET,
    sameSite: getCookieSameSite(process.env.COOKIE_SAME_SITE),
    secure: process.env.COOKIE_SECURE === 'true',
  },
  getCookie: (req, cookieName) => {
    return req.signedCookies[cookieName] || req.cookies[cookieName];
  },
};
