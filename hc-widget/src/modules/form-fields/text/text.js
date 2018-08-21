import fieldTemplate from './text.view.hbs';

const textField = {
  fieldTemplate,

  getField() {
    return this.el.querySelector('input');
  },

  value() {
    return this.getField().value || null;
  },
};

export default textField;