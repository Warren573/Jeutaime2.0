// Le Café de Paris utilise maintenant le nouveau SalonScreen avec mode portrait/paysage
import React from 'react';
import { useRouter } from 'expo-router';
import SalonScreen from '../../src/screens/SalonScreen';

// Redirect to the salon with id 'cafe_paris'
export default function CafeParisRoute() {
  // On utilise directement SalonScreen avec un override du salonId
  return <SalonScreen />;
}
