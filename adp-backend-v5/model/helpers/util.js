const _ = require('lodash');

function getFeModule(_list) {
  const list = _.isString(_list) ? [_list] : _list;
  const obj = {}
  // eslint-disable-next-line no-undef
  const injector = angular.element(document).injector();

  _.each(list, name => {
    obj[name] = injector.get(name);
  })

  return obj;
}

module.exports = {getFeModule};
