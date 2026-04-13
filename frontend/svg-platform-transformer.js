/**
 * svg-platform-transformer.js
 * ────────────────────────────────────────────────────────────────────────────
 * Transformer Metro SVG qui branche selon la plateforme :
 *
 *  mobile (ios / android)
 *    → react-native-svg-transformer
 *    → require('./file.svg') retourne un composant React (<Svg .../>)
 *
 *  web
 *    → SVG encodé en base64 data URI string
 *    → require('./file.svg') retourne "data:image/svg+xml;base64,..."
 *    → compatible SvgUri de react-native-svg
 */

const {
  createTransformer,
  getExpoTransformer,
  getReactNativeTransformer,
} = require('react-native-svg-transformer');

const upstreamTransformer = getExpoTransformer() || getReactNativeTransformer();

// Transformer natif : SVG → composant React via SVGR + Babel
const nativeSvgTransformer = createTransformer(upstreamTransformer);

module.exports = {
  transform: async ({ src, filename, options, ...rest }) => {
    if (filename.endsWith('.svg') && options?.platform === 'web') {
      // Web : encoder le contenu SVG en data URI base64
      const svgContent = typeof src === 'string' ? src : src.toString('utf8');
      const base64    = Buffer.from(svgContent).toString('base64');
      const dataUri   = `data:image/svg+xml;base64,${base64}`;

      // Retourner un module JS simple via le transformer Babel upstream
      return upstreamTransformer.transform({
        src:      `module.exports = ${JSON.stringify(dataUri)};`,
        filename,
        options,
        ...rest,
      });
    }

    // Mobile : déléguer à react-native-svg-transformer
    return nativeSvgTransformer({ src, filename, options, ...rest });
  },
};
