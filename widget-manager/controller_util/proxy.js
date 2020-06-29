// proxy-agent uses LRU
const ProxyAgent = require('proxy-agent');
const url = require('url');

function getAxiosProxySettings() {
  const settings = { proxy: false };

  const { HTTP_PROXY, HTTPS_PROXY, REJECT_UNAUTHORIZED = false } = process.env;
  if (HTTP_PROXY) {
    settings.httpAgent = new ProxyAgent(HTTP_PROXY);
  }
  if (HTTPS_PROXY) {
    settings.httpsAgent = new ProxyAgent({ ...url.parse(HTTPS_PROXY), rejectUnauthorized: REJECT_UNAUTHORIZED });
  }

  return settings;
}

module.exports = { getAxiosProxySettings };
