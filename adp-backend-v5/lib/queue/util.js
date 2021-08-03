const Queue = require('bull');
const _ = require('lodash');

const { customAlphabet } = require('nanoid');
// https://github.com/CyberAP/nanoid-dictionary/blob/master/nolookalikes.js without lowercased
const alphabet = '2346789ABCDEFGHJKLMNPQRTUVWXYZ';
const nanoid = customAlphabet(alphabet, 7);

class PatchedQueue extends Queue {
  add(name, data, opts) {
    if (typeof name !== 'string') {
      opts = data;
      data = name;
      name = null;
    }
    opts = getOptions({ options: opts, queueName: this.name });

    if (name === null) {
      return Queue.prototype.add.call(this, data, opts);
    }
    return Queue.prototype.add.call(this, name, data, opts);
  }
}

function getOptions({ options, queueName }) {
  const resultOpts = _.isPlainObject(options) ? options : {};
  resultOpts.jobId = `${queueName}-${nanoid()}`;
  return resultOpts;
}

module.exports = {
  Queue: PatchedQueue,
};
