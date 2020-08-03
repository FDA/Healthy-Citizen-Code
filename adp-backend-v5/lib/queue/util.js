const Queue = require('bull');
const _ = require('lodash');

const { customAlphabet } = require('nanoid');
// https://github.com/CyberAP/nanoid-dictionary/blob/master/nolookalikes.js without lowercased
const alphabet = '2346789ABCDEFGHJKLMNPQRTUVWXYZ';
const nanoid = customAlphabet(alphabet, 7);

class PatchedQueue extends Queue {
  add(name, data, opts) {
    const jobId = `${this.name}-${nanoid()}`;

    if (typeof name !== 'string') {
      data = setJobId(data);
    } else {
      opts = setJobId(opts);
    }

    return Queue.prototype.add.call(this, name, data, opts);

    function setJobId(options) {
      const _options = _.isPlainObject(options) ? options : {};
      _options.jobId = jobId;
      return _options;
    }
  }
}

module.exports = {
  Queue: PatchedQueue,
};
