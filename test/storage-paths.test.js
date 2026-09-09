const assert = require('node:assert/strict');
const path = require('node:path');
const test = require('node:test');

const modulePath = require.resolve('../backend/utils/storagePaths');

test('resolves a custom upload root consistently for assets', () => {
  const originalUploadPath = process.env.UPLOAD_PATH;
  const customRoot = path.join('C:', 'event-registration-data', 'uploads');
  process.env.UPLOAD_PATH = customRoot;
  delete require.cache[modulePath];

  const { uploadRoot, eventAssetRoot } = require('../backend/utils/storagePaths');
  assert.equal(uploadRoot, path.resolve(customRoot));
  assert.equal(eventAssetRoot, path.join(uploadRoot, 'event-logos'));

  if (originalUploadPath === undefined) delete process.env.UPLOAD_PATH;
  else process.env.UPLOAD_PATH = originalUploadPath;
  delete require.cache[modulePath];
});
