const { spawn } = require('child_process');
require('./add-runAsync-to-node-vm');
const { NodeVM } = require('vm2');
const _ = require('lodash');

function getLogRegexp(regexStr) {
  return regexStr ? RegExp(regexStr, 'gm') : null;
}

function getProgressRegexp(regexStr) {
  return regexStr ? RegExp(regexStr, '') : null;
}

function runShellCommand(job, context) {
  const { log } = context;
  const { command, progressRegex, logRegex } = job.data;

  const progressRegExp = getProgressRegexp(progressRegex);
  const logRegExp = getLogRegexp(logRegex);

  // command should contain all args, i.e. it's being executed in shell mode
  const proc = spawn(command, [], { shell: true });
  const logs = [];

  return new Promise((resolve, reject) => {
    proc.stdout.on('data', (data) => {
      const strData = data.toString();

      if (progressRegExp) {
        const progressMatch = strData.match(progressRegExp);
        const progressStr = _.last(progressMatch);
        if (progressStr) {
          const progress = Number(progressStr);
          if (progress) {
            job.progress(progressStr);
          } else {
            log.error(`Invalid progress '${progressStr}' for jobId ${job.id}.`);
          }
        }
      }

      if (logRegExp) {
        const logMatch = strData.match(logRegExp);
        if (logMatch) {
          log.info(...logMatch);
          logs.push(...logMatch);
        }
      }
    });

    proc.stderr.on('data', (data) => {
      const strData = data.toString();

      if (logRegExp) {
        const logMatch = strData.match(logRegExp);
        if (logMatch) {
          log.error(...logMatch);
          logs.push(...logMatch);
        }
      }
    });

    proc.on('error', (err) => {
      reject(new Error(err));
    });

    proc.on('close', (code) => {
      const logsStr = logs.join('');
      if (code !== 0) {
        return reject(new Error(`Process exited with error code ${code}.\n${logsStr}`));
      }
      job.progress(100);
      resolve(logsStr);
    });
  });
}

async function runBackendCommand(job, context) {
  const vm = new NodeVM({
    sandbox: { ...context, job },
    wrapper: 'none',
    require: {
      external: true,
    },
  });
  return vm.runAsync(job.data.backendCommand, __filename);
}

module.exports = (context) => async (job) => {
  const jobContext = context.getCommonContext();
  const { type = 'shellCommand' } = job.data;
  if (type === 'shellCommand') {
    return runShellCommand(job, jobContext);
  }
  if (type === 'backendCommand') {
    return runBackendCommand(job, jobContext);
  }
  throw new Error(`Invalid command type ${type}`);
};
