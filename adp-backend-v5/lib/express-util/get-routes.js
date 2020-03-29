const _ = require('lodash');

const regexpExpressRegexp = /^\/\^\\\/(?:(:?[\w\\.-]*(?:\\\/:?[\w\\.-]*)*)|(\(\?:\(\[\^\\\/]\+\?\)\)))\\\/.*/;
const regexpExpressParam = /\(\?:\(\[\^\\\/]\+\?\)\)/g;

/**
 * Returns true if found regexp related with express params
 */
const hasParams = function (pathRegexp) {
  return regexpExpressParam.test(pathRegexp);
};

const parseExpressRoute = function (route, basePath, authHandler) {
  const path = basePath + (basePath && route.path === '/' ? '' : route.path);
  const method = _.keys(route.methods)[0];
  const isAuth = _.find(route.stack, (layer) => layer.handle === authHandler);

  return `${method.toUpperCase()} ${path}${isAuth ? ' AUTH' : ''}`;
};

const parseExpressPath = function (expressPathRegexp, params) {
  let parsedPath = regexpExpressRegexp.exec(expressPathRegexp);
  let parsedRegexp = expressPathRegexp;
  let paramIdx = 0;

  while (hasParams(parsedRegexp)) {
    parsedRegexp = parsedRegexp.toString().replace(/\(\?:\(\[\^\\\/]\+\?\)\)/, `:${params[paramIdx].name}`);
    paramIdx++;
  }

  if (parsedRegexp !== expressPathRegexp) {
    parsedPath = regexpExpressRegexp.exec(parsedRegexp);
  }

  parsedPath = parsedPath[1].replace(/\\\//g, '/');

  return parsedPath;
};

const parseEndpoints = function ({ app, authHandler, basePath = '', endpoints = [] }) {
  const stack = app.stack || (app._router && app._router.stack);

  stack.forEach((stackItem) => {
    if (stackItem.route) {
      endpoints.push(parseExpressRoute(stackItem.route, basePath, authHandler));
    } else if (stackItem.name === 'router' || stackItem.name === 'bound dispatch') {
      if (regexpExpressRegexp.test(stackItem.regexp)) {
        const parsedPath = parseExpressPath(stackItem.regexp, stackItem.keys);

        parseEndpoints({
          app: stackItem.handle,
          authHandler,
          basePath: `${basePath}/${parsedPath}`,
          endpoints,
        });
      } else {
        parseEndpoints({ app: stackItem.handle, authHandler, basePath, endpoints });
      }
    }
  });

  return endpoints;
};

/**
 * Returns an array of strings with all the detected endpoints
 * @param {Object} app the express/route instance to get the endpoints from
 */
const getRoutes = function (app, authHandler) {
  return parseEndpoints({ app, authHandler });
};

module.exports = {
  getRoutes,
};
