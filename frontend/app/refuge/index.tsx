import React, { useEffect, useState } from 'react';
import { RefugeMainScreen } from '../../src/screens/RefugeMainScreen';
import { RefugeHomeScreen } from './RefugeHomeScreen';
import { refugeApi } from '../../src/api/refuge-api';

export default function RefugePage() {
  const [loading, setLoading] = useState(true);
  const [sessionId, setSessionId] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      console.log('🏠 [DISPATCHER] Starting RefugePage load...');
      try {
        const active = await refugeApi.getActive();
        console.log('🏠 [DISPATCHER] Raw activeSession:', active);
        console.log('🏠 [DISPATCHER] activeSession?.id:', active?.id);

        if (active?.id) {
          console.log('🏠 [DISPATCHER] Setting sessionId to:', active.id);
          setSessionId(active.id);
        } else {
          console.log('🏠 [DISPATCHER] No active session found (active?.id is falsy)');
        }
      } catch (error) {
        console.error('🏠 [DISPATCHER] Error checking active Refuge session:', error);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  if (loading) {
    console.log('🏠 [DISPATCHER] Still loading...');
    return null;
  }

  if (sessionId) {
    console.log('🏠 [DISPATCHER] Rendering RefugeMainScreen with sessionId:', sessionId);
    return <RefugeMainScreen sessionIdProp={sessionId} />;
  }

  console.log('🏠 [DISPATCHER] Rendering RefugeHomeScreen (no session)');
  return <RefugeHomeScreen />;
}
