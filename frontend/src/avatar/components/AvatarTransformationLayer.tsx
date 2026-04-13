/**
 * AvatarTransformationLayer — Overlay de transformation avatar
 * ─────────────────────────────────────────────────────────────────────────────
 * Lit transformationRegistry pour positionner et animer les assets.
 * Supporte plusieurs assets superposés (ex: future transformation multi-couche).
 *
 * Animations par animationKey :
 *   popOnHead     (pirate) → spring scale 0→1 + fade in rapide
 *   fadeOverlay   (ghost)  → fade in + boucle douce d'opacité
 *   stoneFade     (statue) → fade in lent (effet de pétrification)
 *   poofTransform (frog)   → spring overshoot + fade in
 *
 * L'expiration est gérée par SalonAvatarCard (source unique de vérité).
 * Ce composant reçoit transformation=null quand l'effet est expiré.
 * L'unmount React nettoie les animations via le return du useEffect.
 *
 * Fix race condition fadeOverlay :
 *   result.finished est vérifié dans le callback du fade-in initial.
 *   Si l'animation est interrompue (changement de transformation, unmount),
 *   finished=false → la boucle ghost ne démarre pas → pas de fuite.
 *
 * Pour remplacer un visuel : changer le SVG dans assets/avatar/transformations/.
 */

import React, { useEffect, useRef } from 'react';
import { Animated, View } from 'react-native';
import type { TransformationType } from '../types/avatarTypes';
import { transformationRegistry } from '../config/transformationRegistry';
import { AvatarLayer } from './AvatarLayer';

interface Props {
  transformation: TransformationType | null | undefined;
  avatarSize:     number;
}

export function AvatarTransformationLayer({ transformation, avatarSize }: Props) {
  const scaleVal   = useRef(new Animated.Value(0)).current;
  const opacityVal = useRef(new Animated.Value(0)).current;
  const loopRef    = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    // Reset complet — arrête toute animation en cours, y compris la boucle ghost
    loopRef.current?.stop();
    loopRef.current = null;
    scaleVal.stopAnimation();
    opacityVal.stopAnimation();
    scaleVal.setValue(0);
    opacityVal.setValue(0);

    if (!transformation) return;

    const def = transformationRegistry[transformation];
    if (!def) return;

    if (def.animationKey === 'popOnHead') {
      // Chapeau qui "pop" sur la tête
      Animated.parallel([
        Animated.spring(scaleVal, {
          toValue:         1,
          tension:         180,
          friction:        7,
          useNativeDriver: true,
        }),
        Animated.timing(opacityVal, {
          toValue:         1,
          duration:        200,
          useNativeDriver: true,
        }),
      ]).start();

    } else if (def.animationKey === 'fadeOverlay') {
      // Fade in initial → boucle de respiration fantomatique
      // result.finished protège contre la race condition :
      // si stopAnimation() est appelé pendant le fade-in (changement de
      // transformation, unmount), finished=false → la boucle ne démarre pas.
      scaleVal.setValue(1);
      Animated.timing(opacityVal, {
        toValue:         0.86,
        duration:        450,
        useNativeDriver: true,
      }).start((result) => {
        if (!result.finished) return;
        const loop = Animated.loop(
          Animated.sequence([
            Animated.timing(opacityVal, { toValue: 0.62, duration: 1200, useNativeDriver: true }),
            Animated.timing(opacityVal, { toValue: 0.88, duration: 1200, useNativeDriver: true }),
          ]),
        );
        loopRef.current = loop;
        loop.start();
      });

    } else if (def.animationKey === 'stoneFade') {
      // Pétrification progressive
      scaleVal.setValue(1);
      Animated.timing(opacityVal, {
        toValue:         0.88,
        duration:        900,
        useNativeDriver: true,
      }).start();

    } else {
      // poofTransform (frog) — apparition avec overshoot
      Animated.parallel([
        Animated.sequence([
          Animated.spring(scaleVal, {
            toValue:         1.10,
            tension:         320,
            friction:        6,
            useNativeDriver: true,
          }),
          Animated.spring(scaleVal, {
            toValue:         1.00,
            tension:         200,
            friction:        8,
            useNativeDriver: true,
          }),
        ]),
        Animated.timing(opacityVal, {
          toValue:         0.90,
          duration:        300,
          useNativeDriver: true,
        }),
      ]).start();
    }

    return () => {
      // Arrête toutes les animations (dont la boucle ghost si active)
      // — appelé par React sur unmount ou quand transformation change
      loopRef.current?.stop();
      loopRef.current = null;
      scaleVal.stopAnimation();
      opacityVal.stopAnimation();
    };
  }, [transformation, scaleVal, opacityVal]);

  if (!transformation) return null;

  const def = transformationRegistry[transformation];
  if (!def) return null;

  const layerSize = avatarSize * def.position.sizeRatio;

  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position:  'absolute',
        width:     layerSize,
        height:    layerSize,
        top:       `${def.position.topOffsetPercent}%`,
        left:      `${def.position.leftOffsetPercent}%`,
        zIndex:    def.zLayer === 'behind' ? 0 : 100,
        opacity:   opacityVal,
        transform: [{ scale: scaleVal }],
      }}
    >
      {def.assetIds.map((assetId) => (
        <View
          key={assetId}
          style={{ position: 'absolute', width: layerSize, height: layerSize }}
        >
          <AvatarLayer assetId={assetId} size={layerSize} />
        </View>
      ))}
    </Animated.View>
  );
}
