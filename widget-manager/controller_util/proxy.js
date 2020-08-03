const HttpsProxyAgent = require("https-proxy-agent");
const HttpProxyAgent = require("http-proxy-agent");
const url = require('url');

function getAxiosProxySettings() {
  const settings = { proxy: false };

  const { HTTP_PROXY, HTTPS_PROXY, REJECT_UNAUTHORIZED } = process.env;
  if (HTTP_PROXY) {
    settings.httpAgent = new HttpProxyAgent(HTTP_PROXY);
  }
  if (HTTPS_PROXY) {
    settings.httpsAgent = new HttpsProxyAgent({ ...url.parse(HTTPS_PROXY), rejectUnauthorized: REJECT_UNAUTHORIZED === 'true' });
  }

  return settings;
}

module.exports = { getAxiosProxySettings };
