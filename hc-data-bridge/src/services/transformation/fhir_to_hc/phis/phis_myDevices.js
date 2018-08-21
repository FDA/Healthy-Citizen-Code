const _ = require('lodash');

module.exports = {
  extensionToProductId (extensionArray) {
    const url = 'https://hc-data-bridge-stage.conceptant.com/phis.myDevices.productId';
    const value = _.filter(extensionArray, extension => extension.url === url);
    return value.length ? value[0].valueString : null;
  },
  extensionToDeviceUsage (extensionArray) {
    const url = 'https://hc-data-bridge-stage.conceptant.com/phis.myDevices.deviceUsage';
    const value = _.filter(extensionArray, extension => extension.url === url);
    return value.length ? value[0].valueString : null;
  },
  extensionToPrescribed (extensionArray) {
    const url = 'https://hc-data-bridge-stage.conceptant.com/phis.myDevices.prescribed';
    const value = _.filter(extensionArray, extension => extension.url === url);
    return value.length ? value[0].valueString : null;
  },
  extensionToStart (extensionArray) {
    const url = 'https://hc-data-bridge-stage.conceptant.com/phis.myDevices.start';
    const value = _.filter(extensionArray, extension => extension.url === url);
    return value.length ? value[0].valueString : null;
  },
  extensionToEnd (extensionArray) {
    const url = 'https://hc-data-bridge-stage.conceptant.com/phis.myDevices.end';
    const value = _.filter(extensionArray, extension => extension.url === url);
    return value.length ? value[0].valueString : null;
  },
  extensionToSerialNumber (extensionArray) {
    const url = 'https://hc-data-bridge-stage.conceptant.com/phis.myDevices.serialNumber';
    const value = _.filter(extensionArray, extension => extension.url === url);
    return value.length ? value[0].valueString : null;
  },
  extensionToKey (extensionArray) {
    const url = 'https://hc-data-bridge-stage.conceptant.com/phis.myDevices.key';
    const value = _.filter(extensionArray, extension => extension.url === url);
    return value.length ? value[0].valueString : null;
  },
};
