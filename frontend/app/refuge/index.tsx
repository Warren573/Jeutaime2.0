import React, { useEffect, useState } from 'react';
import { RefugeMainScreen } from '../../src/screens/RefugeMainScreen';
import { RefugeHomeScreen } from './RefugeHomeScreen';
import { refugeApi } from '../../src/api/refuge-api';

export default function RefugePage() {
  const [sessionId, setSessionId] = useState<string | null>(null);

  useEffect(() => {
    const checkActiveSession = async () => {
      try {
        const activeSession = await refugeApi.getActive();
        if (activeSession?.id) {
          setSessionId(activeSession.id);
        }
      } catch (error) {
        console.error('Error checking active Refuge session:', error);
      }
    };

    checkActiveSession();
  }, []);

  if (sessionId) {
    return <RefugeMainScreen sessionIdProp={sessionId} />;
  }

  return <RefugeHomeScreen />;
}
