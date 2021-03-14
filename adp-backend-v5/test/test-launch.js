const { spawnSync } = require('child_process');
const minimist = require('minimist');

function launchTests() {
  require('dotenv').load({ path: './test/backend/.env.test' });
  const argv = minimist(process.argv.slice(2));
  const testMaxWorkers = argv.TEST_MAX_WORKERS || process.env.TEST_MAX_WORKERS || 1;
  console.info(`Running tests with max workers = ${testMaxWorkers}`);

  const spawnOpts = {
    shell: true,
    stdio: 'inherit',
    env: { ...process.env, TEST_MAX_WORKERS: testMaxWorkers },
  };
  const npmScripts = ['test-backend', 'test-app-basic', 'test-app-specific'];
  for (const npmScript of npmScripts) {
    const testBackendProc = spawnSync('npm', ['run', npmScript], spawnOpts);
    if (testBackendProc.error) {
      throw new Error(testBackendProc.error.stack);
    }
    if (testBackendProc.status !== 0) {
      return testBackendProc.status;
    }
  }
}

function clearTestDatabses() {
  spawnSync('npm', ['run', 'clear-test-databases']);
}

function launchTestsAndClearTestDbs() {
  let code;
  try {
    code = launchTests();
  } catch (e) {
    console.error(e.stack);
    code = -1;
  } finally {
    clearTestDatabses();
    process.exit(code);
  }
}

launchTestsAndClearTestDbs();
