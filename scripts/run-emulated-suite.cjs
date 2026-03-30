const { spawn } = require('child_process');
const path = require('path');
const { ROOT_DIR } = require('./emulator-config.cjs');
const { waitForEmulators } = require('./wait-for-emulators.cjs');
const { resetEmulators } = require('./reset-emulators.cjs');
const { seedEmulators } = require('./seed-emulators.cjs');

const vitestCli = path.join(ROOT_DIR, 'node_modules', 'vitest', 'vitest.mjs');
const playwrightCli = path.join(ROOT_DIR, 'node_modules', '@playwright', 'test', 'cli.js');

function runCommand(args) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, args, {
      cwd: ROOT_DIR,
      stdio: 'inherit',
      env: process.env,
    });

    child.on('exit', (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`Command failed: ${process.execPath} ${args.join(' ')}`));
    });

    child.on('error', (error) => {
      reject(error);
    });
  });
}

async function runSuite() {
  const isSmoke = process.argv.includes('--smoke');

  const prepareEnvironment = async () => {
    await waitForEmulators();
    await resetEmulators();
    await seedEmulators();
  };

  await prepareEnvironment();
  await runCommand([vitestCli, 'run', '--config', 'vitest.emulator.config.js', 'tests/rules']);

  await prepareEnvironment();
  await runCommand([vitestCli, 'run', '--config', 'vitest.emulator.config.js', 'tests/functions']);

  await prepareEnvironment();
  await runCommand([
    playwrightCli,
    'test',
    ...(isSmoke ? ['--grep', '@smoke'] : []),
  ]);
}

runSuite().catch((error) => {
  console.error(error.message || error);
  process.exitCode = 1;
});
