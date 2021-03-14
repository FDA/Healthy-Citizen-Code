const _ = require('lodash');
const customAlphabet = require('nanoid').customAlphabet;
// excluding "confusing characters": "Il1O08B"
const alphabet = '2345679ACDEFGHJKMNOPQRSTUVWXYZ';
const generate = customAlphabet(alphabet, 24)

module.exports = function () {
  const m = {
    id24: function() {
      const action = this.action;
      if (action === 'create' || action === 'clone') {
        const id = generate();
        _.set(this.row, this.path, id);
        return id;
      }

      // return new input to make it editable
      const input = $('<input type="text" spellcheck="false">');
      input.val(this.data);
      input.on('change', () => { _.set(this.row, this.path, input.val()); });
      return input;
    },
  };

  return m;
};
