module.exports = function () {
  const m = {};

  m.init = (appLib) => {
    appLib.addRoute('get', `/singleDynamicList`, [m.dynamicList]);
    appLib.addRoute('get', `/arrayDynamicList`, [m.dynamicList]);
  };

  m.dynamicList = function (req, res, next) {
    return res.json({
      data: {
        val1: 'val1',
        val2: 'val2',
        val3: 'val3',
        val4: 'val4',
      },
    });
  };

  return m;
};
