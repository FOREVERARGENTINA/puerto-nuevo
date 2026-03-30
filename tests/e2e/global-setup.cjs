const { waitForEmulators } = require('../../scripts/wait-for-emulators.cjs');

module.exports = async () => {
  await waitForEmulators();
};
