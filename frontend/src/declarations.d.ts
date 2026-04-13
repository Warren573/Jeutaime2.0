/**
 * Déclaration de module SVG pour react-native-svg-transformer
 * Chaque fichier .svg importé devient un composant React Native SVG.
 */
declare module '*.svg' {
  import React from 'react';
  import { SvgProps } from 'react-native-svg';
  const content: React.FC<SvgProps>;
  export default content;
}
