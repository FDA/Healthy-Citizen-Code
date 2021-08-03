module.exports.createTriStateBooleanControl = (args, onChange) => {
  const tpl = `<div field-name="${args.fieldSchema.fieldName}"></div>`;

  const control = $(tpl).dxCheckBox({
    onInitialized(e) {
      if (e.component.option('value') === false) {
        e.component.setUndefinedNextTime = true;
      }
    },
    value: _.isNil(args.data) ? undefined : args.data,
    onValueChanged(e) {
      if (!e.component.setUndefinedNextTime) {
        onChange(e.value);
        (e.value === true) && _.set(args.row, args.fieldSchema.fieldName, true);
      }

      if (e.component.skipOnValueChanged) {
        e.component.skipOnValueChanged = false;
        return;
      }

      if (e.component.setUndefinedNextTime) {
        e.component.setUndefinedNextTime = false;
        e.component.skipOnValueChanged = true;
        e.component.option('value', undefined);
        _.set(args.row, args.fieldSchema.fieldName, false);
        return;
      }

      if (e.value === false) {
        e.component.setUndefinedNextTime = true;
        _.set(args.row, args.fieldSchema.fieldName, false);
      }
    },
  });

  return control;
};

module.exports.setValuesToControl = (values) => {
  const set = (entry) => {
    const el = $(`[field-name="${entry[0]}"]`);
    const instance = el.dxCheckBox('instance');
    instance.setUndefinedNextTime = false;
    instance.option('value', entry[1]);
  }

  Object.entries(values).forEach(set);
};
