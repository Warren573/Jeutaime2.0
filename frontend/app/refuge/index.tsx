import React, { useEffect, useState } from 'react';
import { RefugeMainScreen } from '../../src/screens/RefugeMainScreen';
import { RefugeHomeScreen } from './RefugeHomeScreen';
import { refugeApi } from '../../src/api/refuge-api';

export default function RefugePage() {
  const [loading, setLoading] = useState(true);
  const [sessionId, setSessionId] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const active = await refugeApi.getActive();

        if (active?.id) {
          setSessionId(active.id);
        }
      } catch (error) {
        console.error('Error checking active Refuge session:', error);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  if (loading) {
    return null;
  }

  if (sessionId) {
    return <RefugeMainScreen sessionIdProp={sessionId} />;
  }

  return <RefugeHomeScreen />;
}
