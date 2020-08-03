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

function getWgetProxyParams() {
  let params = ``;

  const { HTTP_PROXY, HTTPS_PROXY, FTP_PROXY, REJECT_UNAUTHORIZED = false } = process.env;
  if (HTTP_PROXY) {
    params += `-e http_proxy=${HTTP_PROXY} `;
  }
  if (HTTPS_PROXY) {
    params += `-e https_proxy=${HTTPS_PROXY} `;
    if (!REJECT_UNAUTHORIZED) {
      params += `--no-check-certificate `;
    }
  }
  if (FTP_PROXY) {
    params += `-e ftp_proxy=${FTP_PROXY} `;
  }
  if (params) {
    params += `-e use_proxy=yes `;
  }

  return params;
}

module.exports = { getAxiosProxySettings, getWgetProxyParams };
