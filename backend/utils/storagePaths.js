const path = require('path');

const uploadRoot = path.resolve(process.env.UPLOAD_PATH || path.join(process.cwd(), 'uploads'));
const eventAssetRoot = path.join(uploadRoot, 'event-logos');

module.exports = { uploadRoot, eventAssetRoot };
