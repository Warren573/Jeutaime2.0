module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // Transform import.meta.env to process.env for web compatibility
      function () {
        return {
          visitor: {
            MemberExpression(path) {
              if (
                path.get('object').isMemberExpression() &&
                path.get('object.object').isMetaProperty() &&
                path.get('object.property').isIdentifier({ name: 'env' })
              ) {
                // Replace import.meta.env.X with process.env.X
                const property = path.node.property.name;
                path.replaceWithSourceString(`process.env.${property}`);
              }
            },
            MetaProperty(path) {
              // Replace import.meta.env with process.env
              if (
                path.parentPath.isMemberExpression() &&
                path.parentPath.get('property').isIdentifier({ name: 'env' })
              ) {
                path.parentPath.replaceWithSourceString('process.env');
              }
            },
          },
        };
      },
    ],
  };
};
