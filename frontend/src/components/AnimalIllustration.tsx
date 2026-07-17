import React, { useEffect, useRef, useState } from "react";
import { View, Image, StyleSheet, StyleProp, ViewStyle, Animated, Easing } from "react-native";
import { ANIMAL_EMOJIS, RefugeAnimal } from "../data/refugeAnimals";
import { ANIMAL_IMAGES } from "../data/refugeAnimalImages";

interface AnimalIllustrationProps {
  animal: RefugeAnimal;
  size?: number;
  style?: StyleProp<ViewStyle>;
}

/**
 * Composant officiel du Refuge pour afficher un animal : PNG local si fourni
 * dans frontend/assets/images/pets/ (voir ANIMAL_IMAGES), sinon fallback
 * emoji (jamais de crash, jamais de zone vide).
 * `size` est la dimension maximale du cadre : le PNG garde son ratio
 * d'origine (portrait ou paysage) sans jamais être rogné ni étiré.
 */
export function AnimalIllustration({ animal, size = 200, style }: AnimalIllustrationProps) {
  const [failed, setFailed] = useState(false);
  const [aspectRatio, setAspectRatio] = useState(1);
  const bob = useRef(new Animated.Value(0)).current;

  const source = ANIMAL_IMAGES[animal];
  const showImage = source !== null && !failed;

  useEffect(() => {
    if (source === null) return;
    const resolved = Image.resolveAssetSource(source);
    if (resolved && resolved.width > 0 && resolved.height > 0) {
      setAspectRatio(resolved.width / resolved.height);
    }
  }, [source]);

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
      {showImage ? (
        <Animated.View style={{ alignItems: "center", transform: [{ translateY }] }}>
          <Image
            source={source}
            style={{ width: displayWidth, height: displayHeight }}
            resizeMode="contain"
            onError={() => setFailed(true)}
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

const styles = StyleSheet.create({
  groundShadow: {
    height: 8,
    borderRadius: 999,
    backgroundColor: "rgba(0,0,0,0.12)",
    alignSelf: "center",
    marginTop: -4,
  },
});
