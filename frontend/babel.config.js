module.exports = function (api) {
  api.cache(true);
  const isWeb = process.env.EXPO_WEB === 'true' || api.caller((caller) => caller?.platform === 'web');
  
  return {
    presets: [
      [
        'babel-preset-expo',
        {
          // Transform import.meta for web compatibility
          unstable_transformImportMeta: true,
          // Disable React Refresh for web to avoid conflicts
          web: {
            disableImportExportTransform: false,
          },
        },
      ],
    ],
  };
};
