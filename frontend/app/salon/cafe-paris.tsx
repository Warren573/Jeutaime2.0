// Le Café de Paris - redirige vers le nouveau SalonScreen avec l'ID correct
import React from 'react';
import { Redirect } from 'expo-router';

export default function CafeParisRoute() {
  return <Redirect href="/salon/cafe_paris" />;
}
