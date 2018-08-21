import fieldTemplate from './checkbox.view.hbs';

const checkboxField = {
  fieldTemplate,

  getField() {
    return this.el.querySelector('input');
  },

  value() {
    return this.getField().checked;
  },

  setValue(value) {
    this.getField().checked = !!value;
  },

  setReadonly(status) {
    const field = this.el.querySelector('input');
    field.disabled = status;
    this.readonly = status;
  }
};

export default checkboxField;