/**
 * FormRenderers are used to render data in forms only and only used on the frontend
 *
 * Each renderer receives this fixed set of parameters:
 * data - the cell data
 * type - type of rendering: filter, display, sort, undefined, etc
 * row - the entire record the data need to be rendered for
 * meta - metainformation in datatables format: https://datatables.net/reference/option/columns.render
 */

function guessTimeZone(){
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch(e) {
    return '';
  }
}

module.exports = function () {
  const formRenderUtil = require('./form_renderers_util');
  const rawTimeZones = require('@vvo/tzdb/raw-time-zones.json');
  const m = {
    asIs(data) {
      return data;
    },
    starMaskfunction() {
      return '********';
    },
    otpAdminFormControl() {
      const renderModule = 'AdpOtpConfigControl';
      // eslint-disable-next-line no-undef
      const injector = angular.element(document).injector();

      if (injector.has(renderModule)) {
        const adpOtpConfigControlService = injector.get(renderModule);

        return adpOtpConfigControlService.apply(this);
      }

      return 'No OTP field control module found';
    },

    userSettingsFixedHeader() {
      return formRenderUtil.createTriStateBooleanControl(this, (val) => {
        if (val === false) {
          formRenderUtil.changeValuesToControl({
            fixedNavigation: false,
            fixedRibbon: false,
          });
        }
      });
    },

    userSettingsFixedNavigation() {
      return formRenderUtil.createTriStateBooleanControl(this, (val) => {
        if (val) {
          formRenderUtil.changeValuesToControl({
            fixedWidth: false,
            fixedHeader: true,
          });
        } else if (val === false) {
          formRenderUtil.changeValuesToControl({
            fixedRibbon: false,
          });
        }
      });
    },

    userSettingsFixedRibbon() {
      return formRenderUtil.createTriStateBooleanControl(this, (val) => {
        if (val) {
          formRenderUtil.changeValuesToControl({
            fixedHeader: true,
            fixedNavigation: true,
            fixedWidth: false,
          });
        }
      });
    },

    userSettingsFixedWidth() {
      return formRenderUtil.createTriStateBooleanControl(this, (val) => {
        if (val) {
          formRenderUtil.changeValuesToControl({
            fixedRibbon: false,
            fixedNavigation: false,
          });
        }
      });
    },

    timeZoneControl() {
      const $container = $('<div>');
      const $autodetected = $('<div>');
      const clientAutoDetectText = '<Autodetect>';
      const serverAutoDetectText = '<Server time zone>';
      const selectedOption = findSelectedOption(this.data) || clientAutoDetectText;
      const $select = $('<select>')
        .on('change', e => changeValue(e.target.value));
      const addOptions = [{name: clientAutoDetectText}, {name: serverAutoDetectText}];
      const setRowValue = obj => _.set(this.row, this.path, obj);

      const sortedTimeZones = _.sortBy(rawTimeZones, ['name']);
      _.each(_.union(addOptions, sortedTimeZones),
        option => $select.append($('<option>').text(option.name)));

      $select.val(selectedOption);
      changeValue(selectedOption);

      return $container.append($select)
        .append($autodetected);

      function changeValue(optionString) {
        const object = {};
        let autoDetected = '';

        if (optionString === clientAutoDetectText) {
          autoDetected = guessTimeZone();
          object.value = autoDetected;
          object.isClient = true;
        } else if (optionString === serverAutoDetectText) {
          object.value = autoDetected;
          object.isServer = true;
        } else {
          object.value = optionString;
        }

        $autodetected.text(autoDetected);

        setRowValue(object);
      }

      function findSelectedOption(dataObj) {
        const stringValue = dataObj && dataObj.value;

        if (!stringValue || dataObj.isClient) {
          return clientAutoDetectText;
        }
        if (dataObj.isServer) {
          return serverAutoDetectText;
        }

        const timeZone = rawTimeZones.find(tz => stringValue === tz.name || tz.group.includes(stringValue));

        return timeZone ? timeZone.name : '';
      }
    },
  };
  return m;
};
