const _ = require('lodash');
const commonTransformations = require('../common_transformations');
const helper = require('./../../../lib/helper');

module.exports = {
  // pretransform
  splitMyDevicesToArray (phis, inputSettings) {
    return _.map(phis.myDevices, (device) => {
      const preparedObj = {};
      preparedObj._id = device._id;
      preparedObj.myDevice = device;
      preparedObj.guid = _.get(phis, 'guid') || _.get(inputSettings, 'guid');
      return preparedObj;
    });
  },
  guidToPatient (guid) {
    return guid ? { reference: `Patient/${guid}` } : null;
  },
  myDeviceToExtension (myDevice) {
    const extension = [];
    if (myDevice.productId) {
      const productIdExtension = helper.buildStringExtension('phis.myDevices.productId', myDevice.productId);
      extension.push(productIdExtension);
    }
    if (myDevice.deviceUsage) {
      const deviceUsageExtension = helper.buildStringExtension('phis.myDevices.deviceUsage', myDevice.deviceUsage);
      extension.push(deviceUsageExtension);
    }
    if (myDevice.prescribed) {
      const prescribedExtension = helper.buildStringExtension('phis.myDevices.prescribed', commonTransformations.getDate(myDevice.prescribed));
      extension.push(prescribedExtension);
    }
    if (myDevice.start) {
      const startExtension = helper.buildStringExtension('phis.myDevices.start', commonTransformations.getDate(myDevice.start));
      extension.push(startExtension);
    }
    if (myDevice.end) {
      const endExtension = helper.buildStringExtension('phis.myDevices.end', commonTransformations.getDate(myDevice.end));
      extension.push(endExtension);
    }
    if (myDevice.serialNumber) {
      const myDeviceExtension = helper.buildStringExtension('phis.myDevices.serialNumber', myDevice.serialNumber);
      extension.push(myDeviceExtension);
    }
    if (myDevice.key) {
      const keyExtension = helper.buildStringExtension('phis.myDevices.key', myDevice.key);
      extension.push(keyExtension);
    }
    return extension.length ? extension : null;
  },
};
