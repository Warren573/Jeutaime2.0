import React, { useEffect, useRef, useState } from "react";
import { View, Image, StyleSheet, StyleProp, ViewStyle, Animated, Easing } from "react-native";
import { ANIMAL_EMOJIS, ANIMAL_PNG_FILENAME, RefugeAnimal } from "../data/refugeAnimals";

type RefugeAction = "feed" | "play" | "pet" | "wash";

interface AnimalIllustrationProps {
  animal: RefugeAnimal;
  size?: number;
  style?: StyleProp<ViewStyle>;
  action?: RefugeAction | null;
  isActing?: boolean;
}

/**
 * Composant officiel du Refuge pour afficher un animal : PNG réel si présent
 * dans frontend/public/refuge/, sinon fallback emoji (jamais de crash).
 * `size` est la dimension maximale du cadre : le PNG garde son ratio
 * d'origine (portrait ou paysage) sans jamais être rogné ni étiré.
 *
 * Pendant une action : alterne entre PNG A (neutre) et PNG B (action)
 * toutes les 180ms. Durée totale de l'action : 1200ms, puis retour à A.
 */
export function AnimalIllustration({ animal, size = 200, style, action = null, isActing = false }: AnimalIllustrationProps) {
  const [failed, setFailed] = useState(false);
  const [failedB, setFailedB] = useState(false);
  const [aspectRatio, setAspectRatio] = useState(1);
  const [useB, setUseB] = useState(false);
  const bob = useRef(new Animated.Value(0)).current;

  const animalLower = animal.toLowerCase();
  const filenameA = ANIMAL_PNG_FILENAME[animal];
  const filenameB = action && isActing ? `${animalLower}_${action}_B.png` : null;

  const uriA = filenameA ? `/refuge/${filenameA}` : null;
  const uriB = filenameB && !failedB ? `/refuge/${filenameB}` : null;

  const currentUri = useB && uriB ? uriB : uriA;
  const showImage = Boolean(currentUri) && !failed && (!useB || !failedB);

  // Alternation A-B every 180ms when acting
  useEffect(() => {
    if (!isActing || !uriB) {
      setUseB(false);
      return;
    }

    const interval = setInterval(() => {
      setUseB(prev => !prev);
    }, 180);

    return () => clearInterval(interval);
  }, [isActing, uriB]);

  // Auto-return to A after 1200ms
  useEffect(() => {
    if (!isActing) {
      setUseB(false);
      return;
    }

    const timeout = setTimeout(() => {
      setUseB(false);
    }, 1200);

    return () => clearTimeout(timeout);
  }, [isActing]);

  useEffect(() => {
    if (!currentUri) return;
    let cancelled = false;

    Image.getSize(
      currentUri,
      (width, height) => {
        if (!cancelled && width > 0 && height > 0) {
          setAspectRatio(width / height);
        }
      },
      () => {
        // Dimensions indisponibles : on garde le ratio carré par défaut
      }
    );

    return () => {
      cancelled = true;
    };
  }, [currentUri]);

  useEffect(() => {
    const idle = Animated.loop(
      Animated.sequence([
        Animated.timing(bob, { toValue: 1, duration: 2600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(bob, { toValue: 0, duration: 2600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    idle.start();
    return () => idle.stop();
  }, [bob]);

  const translateY = bob.interpolate({ inputRange: [0, 1], outputRange: [0, -2] });

  // Tient dans le cadre size×size en respectant le ratio réel (jamais de crop/étirement)
  const displayWidth = aspectRatio >= 1 ? size : size * aspectRatio;
  const displayHeight = aspectRatio >= 1 ? size / aspectRatio : size;

  return (
    <View style={[{ width: size, height: size, alignItems: "center", justifyContent: "center" }, style]}>
      {showImage && currentUri ? (
        <Animated.View style={{ alignItems: "center", transform: [{ translateY }] }}>
          <Image
            source={{ uri: currentUri }}
            style={{ width: displayWidth, height: displayHeight }}
            resizeMode="contain"
            onError={() => {
              if (useB) {
                setFailedB(true);
              } else {
                setFailed(true);
              }
            }}
          />
          <View style={[styles.groundShadow, { width: displayWidth * 0.55 }]} />
        </Animated.View>
      ) : (
        <Animated.Text style={{ fontSize: size * 0.5, transform: [{ translateY }] }}>
          {ANIMAL_EMOJIS[animal]}
        </Animated.Text>
      )}
    </View>
  );
}

/** Précharge les PNG des animaux pour éviter tout clignotement au changement de carte. */
export function preloadAnimalIllustrations(animals: readonly RefugeAnimal[]): void {
  animals.forEach(animal => {
    const filename = ANIMAL_PNG_FILENAME[animal];
    if (!filename) return;
    Image.prefetch(`/refuge/${filename}`).catch(() => {
      // PNG absent : le fallback emoji prendra le relais au rendu
    });
  });
}

export type { RefugeAction };

const styles = StyleSheet.create({
  groundShadow: {
    height: 8,
    borderRadius: 999,
    backgroundColor: "rgba(0,0,0,0.12)",
    alignSelf: "center",
    marginTop: -4,
  },
});
