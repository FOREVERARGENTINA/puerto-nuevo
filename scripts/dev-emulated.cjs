const path = require('path');
const { spawn } = require('child_process');
const {
  ROOT_DIR,
  HOST,
  PORTS,
  withFrontendEmulatorEnv,
} = require('./emulator-config.cjs');

const viteEntry = path.join(ROOT_DIR, 'node_modules', 'vite', 'bin', 'vite.js');

const cliArgs = process.argv.slice(2);
const portArgIndex = cliArgs.indexOf('--port');
const requestedPort = portArgIndex >= 0 ? Number(cliArgs[portArgIndex + 1]) : PORTS.vite;
const validPort = Number.isFinite(requestedPort) && requestedPort > 0 ? requestedPort : PORTS.vite;

const args = [
  '--host',
  HOST,
  '--port',
  String(validPort),
];

if (cliArgs.includes('--strict-port')) {
  args.push('--strictPort');
}

const child = spawn(process.execPath, [viteEntry, ...args], {
  cwd: ROOT_DIR,
  env: withFrontendEmulatorEnv(process.env),
  stdio: 'inherit',
});

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 0);
});
