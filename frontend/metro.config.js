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

// Inject React Refresh shim as a polyfill for web
const originalGetPolyfills = config.serializer?.getPolyfills || (() => []);
config.serializer = {
  ...config.serializer,
  getPolyfills: () => {
    const polyfills = originalGetPolyfills();
    return [
      // Add our React Refresh shim at the beginning
      path.resolve(__dirname, 'src/polyfills/react-refresh-shim.js'),
      ...polyfills,
    ];
  },
};

// Reduce the number of workers to decrease resource usage
config.maxWorkers = 2;

module.exports = config;
