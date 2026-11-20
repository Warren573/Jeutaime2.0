import React from 'react';
import ProfileTwoStepDemo from '../../src/screens/ProfileTwoStepDemo';
import { useStore } from '../../src/store/useStore';

export default function ProfilesRoute() {
  const userId = useStore((state) => state.currentUser?.id);
  return userId ? <ProfileTwoStepDemo key={userId} /> : null;
}
