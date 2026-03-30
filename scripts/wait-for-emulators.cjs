const net = require('net');
const { HOST, PORTS } = require('./emulator-config.cjs');

const DEFAULT_TIMEOUT_MS = 60_000;
const POLL_INTERVAL_MS = 250;

function waitForPort({ host, port, timeoutMs = DEFAULT_TIMEOUT_MS }) {
  const startedAt = Date.now();

  return new Promise((resolve, reject) => {
    const attempt = () => {
      const socket = net.createConnection({ host, port });

      socket.once('connect', () => {
        socket.destroy();
        resolve();
      });

      socket.once('error', () => {
        socket.destroy();

        if (Date.now() - startedAt >= timeoutMs) {
          reject(new Error(`Timeout esperando ${host}:${port}`));
          return;
        }

        setTimeout(attempt, POLL_INTERVAL_MS);
      });
    };

    attempt();
  });
}

async function waitForEmulators(timeoutMs = DEFAULT_TIMEOUT_MS) {
  await Promise.all([
    waitForPort({ host: HOST, port: PORTS.auth, timeoutMs }),
    waitForPort({ host: HOST, port: PORTS.firestore, timeoutMs }),
    waitForPort({ host: HOST, port: PORTS.functions, timeoutMs }),
    waitForPort({ host: HOST, port: PORTS.storage, timeoutMs }),
  ]);
}

module.exports = {
  waitForPort,
  waitForEmulators,
};

if (require.main === module) {
  waitForEmulators()
    .then(() => {
      console.log('Firebase emulators listos');
    })
    .catch((error) => {
      console.error(error.message || error);
      process.exitCode = 1;
    });
}
