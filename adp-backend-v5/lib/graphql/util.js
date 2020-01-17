const reDate = /^(?:new )?Date\("?(.+)"?\)$/;
const dateReviver = function(key, value) {
  if (typeof value === 'string') {
    const exec = reDate.exec(value);
    if (exec) {
      return new Date(exec[1]);
    }
  }
  return value;
};

module.exports = {
  dateReviver,
};
