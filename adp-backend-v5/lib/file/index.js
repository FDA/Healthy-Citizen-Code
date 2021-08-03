module.exports = (appLib) => ({
  controller: require('./file-controller')(appLib),
  util: require('./file-controller-util')(appLib),
  constants: require('./constants'),
});
