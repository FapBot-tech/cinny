import { useEffect, useState } from 'react';
import { useMatrixClient } from './useMatrixClient';

export function useIsAdmin() {
  const mx = useMatrixClient();
  const [isAdmin, setIsAdmin] = useState<boolean>(false);

  useEffect(() => {
    let mounted = true;

    const checkIsAdmin = async () => {
      try {
        // 1. Check using the official SDK method for Synapse admin detection
        // This calls /_synapse/admin/v1/users/$userId/admin
        const isSynapseAdmin = await mx.isSynapseAdministrator();
        if (mounted) {
          setIsAdmin(isSynapseAdmin);
          return;
        }
      } catch (err) {
        // If the endpoint is not found or fails, fallback to whoami check
        try {
          const response: any = await mx.whoami();
          if (mounted) {
            setIsAdmin(!!response.is_admin);
            return;
          }
        } catch {
          // Ignore
        }
      }

      if (mounted) {
        setIsAdmin(false);
      }
    };

    checkIsAdmin();
  }, [mx]);

  return isAdmin;
}
