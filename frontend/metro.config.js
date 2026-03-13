// metro.config.js
const { getDefaultConfig } = require("expo/metro-config");
const path = require('path');
const { FileStore } = require('metro-cache');

const config = getDefaultConfig(__dirname);

// Use a stable on-disk store (shared across web/android)
const root = process.env.METRO_CACHE_ROOT || path.join(__dirname, '.metro-cache');
config.cacheStores = [
  new FileStore({ root: path.join(root, 'cache') }),
];

// Disable hot reload in CI mode for web
config.server = {
  ...config.server,
  enhanceMiddleware: (middleware) => {
    return (req, res, next) => {
      // Inject React Refresh polyfill for web
      if (req.url && req.url.includes('platform=web')) {
        res.setHeader('X-React-Refresh-Disabled', 'true');
      }
      return middleware(req, res, next);
    };
  },
};

// Reduce the number of workers to decrease resource usage
config.maxWorkers = 2;

module.exports = config;
