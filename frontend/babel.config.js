module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // Syntax support for import.meta
      '@babel/plugin-syntax-import-meta',
    ],
  };
};
