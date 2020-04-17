const { spawn } = require('child_process');
const _ = require('lodash');

function getRegexExtractorFunc(regex) {
  if (!regex) {
    return _.noop;
  }
  const regExp = RegExp(regex, 'gm');
  return regExp.exec.bind(regExp);
}

module.exports = (context) => {
  return (job) => {
    const { command, progressRegex, logRegex } = job.data;
    const progressFunc = getRegexExtractorFunc(progressRegex);
    const logFunc = getRegexExtractorFunc(logRegex);
    const { log } = context.getCommonContext();

    // command should contain all args, i.e. it's being executed in shell mode
    const proc = spawn(command, [], { shell: true });
    const logs = [];

    return new Promise((resolve, reject) => {
      proc.stdout.on('data', (data) => {
        const strData = data.toString();

        const progressMatch = progressFunc(strData);
        const progress = _.last(progressMatch);
        progress && job.progress(progress);

        const logMatch = logFunc(strData);
        const logStr = _.last(logMatch);
        if (logStr) {
          log.info(logStr);
          logs.push(logStr);
        }
      });

      proc.stderr.on('data', (data) => {
        const logMatch = logFunc(data.toString());
        const logStr = _.last(logMatch);
        if (logStr) {
          log.error(logStr);
          logs.push(logStr);
        }
      });

      proc.on('error', (err) => {
        reject(new Error(err));
      });

      proc.on('close', (code) => {
        if (code !== 0) {
          return reject(new Error(`Process exited with error code ${code}`));
        }
        job.progress(100);
        resolve(logs.join('\n'));
      });
    });
  };
};
