// proxy-agent uses LRU
const ProxyAgent = require('proxy-agent');

function getAxiosProxySettings() {
  const settings = { proxy: false };

  const { HTTP_PROXY, HTTPS_PROXY } = process.env;
  if (HTTP_PROXY) {
    settings.httpAgent = new ProxyAgent(HTTP_PROXY);
  }
  if (HTTPS_PROXY) {
    settings.httpsAgent = new ProxyAgent(HTTPS_PROXY);
  }

  return settings;
}

function getWgetProxyParams() {
  let params = ``;

  const { HTTP_PROXY, HTTPS_PROXY, FTP_PROXY } = process.env;
  if (HTTP_PROXY) {
    params += `-e http_proxy=${HTTP_PROXY} `;
  }
  if (HTTPS_PROXY) {
    params += `-e https_proxy=${HTTPS_PROXY} `;
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
