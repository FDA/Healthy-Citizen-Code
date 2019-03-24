function findRoutesInStack(path, stack, method) {
  const routes = [];
  const layerNamesToSkip = ['query', 'expressInit'];

  stack.forEach(layer => {
    const layerName = layer.name;
    if (!layer || !layer.match(path) || layerNamesToSkip.includes(layerName)) {
      return;
    }
    if (layerName === 'router') {
      const routerRoutes = findRoutesInStack(trimPrefix(path, layer.path), layer.handle.stack);
      routes.push(...routerRoutes);
    } else if (layerName === 'bound dispatch') {
      routes.push({ route: layer || null, stack });
    }
  });

  if (method) {
    return routes.filter(r => r.route.methods[method.toLowerCase()]);
  }
  return routes;
}

function findRoutes(app, path) {
  return findRoutesInStack(path, app._router.stack);
}

function trimPrefix(path, prefix) {
  // This assumes prefix is already at the start of path.
  return path.substr(prefix.length);
}

function removeRoutes(app, path, method = '') {
  const foundRoute = findRoutes(app, path);
  const lowerMethod = method.toLowerCase();
  const removedRoutes = [];

  foundRoute.forEach(layer => {
    const { route, stack } = layer;
    if (!route) {
      return;
    }

    const routeIdx = stack.indexOf(route);
    if (routeIdx === -1) {
      return;
    }

    const isMethodDefined = route.route.methods[lowerMethod];
    if (!method) {
      // if no method delete all resource with the given path
      const spliced = stack.splice(routeIdx, 1);
      removedRoutes.push(...spliced);
    } else if (isMethodDefined) {
      // if method defined delete only the resource with the given ath and method
      const spliced = stack.splice(routeIdx, 1);
      removedRoutes.push(...spliced);
    }
  });

  return removedRoutes;
}

module.exports = {
  findRoutes,
  removeRoutes,
};
