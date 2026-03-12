module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // Transform import.meta for web compatibility
      ['transform-import-meta', { module: 'ES6' }],
    ].filter(Boolean),
  };
};
