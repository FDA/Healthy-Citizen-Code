module.exports = {
  getCookieOpts: (config) => ({
    signed: config.COOKIE_SIGNED,
    sameSite: config.COOKIE_SAME_SITE,
    secure: config.COOKIE_SECURE,
  }),
  getCookie: (req, cookieName) => req.signedCookies[cookieName] || req.cookies[cookieName],
  sessionCookieName: 'connect.sid',
};
