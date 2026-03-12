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

// Transform import.meta.env to process.env for web compatibility
config.transformer = {
  ...config.transformer,
  minifierConfig: {
    ...config.transformer?.minifierConfig,
    ecma: 2020,
  },
  // Add a polyfill for import.meta
  getTransformOptions: async () => ({
    transform: {
      experimentalImportSupport: false,
      inlineRequires: true,
    },
  }),
};

// Add resolver for import.meta
config.resolver = {
  ...config.resolver,
  resolverMainFields: ['react-native', 'browser', 'main'],
  platforms: ['ios', 'android', 'web'],
};

// Add serializer to inject polyfill
config.serializer = {
  ...config.serializer,
  getPolyfills: () => {
    const polyfills = config.serializer?.getPolyfills ? config.serializer.getPolyfills() : [];
    return [
      // Polyfill for import.meta.env
      require.resolve('./src/polyfills/import-meta-polyfill.js'),
      ...polyfills,
    ];
  },
};

// Reduce the number of workers to decrease resource usage
config.maxWorkers = 2;

module.exports = config;
