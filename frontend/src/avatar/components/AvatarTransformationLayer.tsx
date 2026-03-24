/**
 * AvatarTransformationLayer — Overlay de transformation avatar
 * ─────────────────────────────────────────────────────────────────────────────
 * Lit transformationRegistry pour positionner et animer les assets.
 * Supporte plusieurs assets superposés (ex: future transformation multi-couche).
 *
 * Animations par animationKey :
 *   popOnHead    (pirate) → spring scale 0→1 + fade in rapide
 *   fadeOverlay  (ghost)  → fade in + boucle douce d'opacité
 *   stoneFade    (statue) → fade in lent (effet de pétrification)
 *   poofTransform (frog)  → spring overshoot + fade in
 *
 * Expiration :
 *   Si expiresAt est fourni et que Date.now() > expiresAt, la transformation
 *   est masquée et les animations nettoyées proprement.
 *
 * Pour remplacer un visuel : changer le SVG dans assets/avatar/transformations/.
 */

import React, { useEffect, useRef, useState } from 'react';
import { Animated, View } from 'react-native';
import type { TransformationType } from '../types/avatarTypes';
import { transformationRegistry } from '../config/transformationRegistry';
import { AvatarLayer } from './AvatarLayer';

interface Props {
  transformation: TransformationType | null | undefined;
  avatarSize:     number;
  /**
   * Timestamp d'expiration (ms epoch).
   * Si fourni et dépassé, la transformation est masquée et les animations nettoyées.
   */
  expiresAt?:     number;
}

export function AvatarTransformationLayer({ transformation, avatarSize, expiresAt }: Props) {
  const scaleVal   = useRef(new Animated.Value(0)).current;
  const opacityVal = useRef(new Animated.Value(0)).current;
  const loopRef    = useRef<Animated.CompositeAnimation | null>(null);

  const [isExpired, setIsExpired] = useState<boolean>(
    () => expiresAt != null && Date.now() >= expiresAt,
  );

  // Timer d'expiration — se déclenche à l'heure exacte
  useEffect(() => {
    if (expiresAt == null) {
      setIsExpired(false);
      return;
    }
    const remaining = expiresAt - Date.now();
    if (remaining <= 0) {
      setIsExpired(true);
      return;
    }
    setIsExpired(false);
    const timer = setTimeout(() => setIsExpired(true), remaining);
    return () => clearTimeout(timer);
  }, [expiresAt]);

  // Animation — reset + relance à chaque changement de transformation ou d'expiration
  useEffect(() => {
    loopRef.current?.stop();
    loopRef.current = null;
    scaleVal.stopAnimation();
    opacityVal.stopAnimation();
    scaleVal.setValue(0);
    opacityVal.setValue(0);

    if (!transformation || isExpired) return;

    const def = transformationRegistry[transformation];
    if (!def) return;

    if (def.animationKey === 'popOnHead') {
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
      scaleVal.setValue(1);
      Animated.timing(opacityVal, {
        toValue:         0.86,
        duration:        450,
        useNativeDriver: true,
      }).start(() => {
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
      scaleVal.setValue(1);
      Animated.timing(opacityVal, {
        toValue:         0.88,
        duration:        900,
        useNativeDriver: true,
      }).start();

    } else {
      // poofTransform (frog)
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
      loopRef.current?.stop();
      loopRef.current = null;
    };
  }, [transformation, isExpired, scaleVal, opacityVal]);

  if (!transformation || isExpired) return null;

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
