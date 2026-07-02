import { MatrixClient } from 'matrix-js-sdk';
import React, { useCallback } from 'react';
import { Dialog, Box, Text, Button, Spinner, config } from 'folds';
import { AsyncStatus, useAsyncCallback } from '../hooks/useAsyncCallback';
import { logoutClient } from '../../client/initMatrix';

export function UserDeactivatedDialog({ mx }: { mx: MatrixClient }) {
  const [logoutState, logout] = useAsyncCallback<void, Error, []>(
    useCallback(async () => {
      await logoutClient(mx);
    }, [mx])
  );

  const ongoingLogout = logoutState.status === AsyncStatus.Loading;

  return (
    <Dialog variant="Surface">
      <Box style={{ padding: config.space.S400 }} direction="Column" gap="400">
        <Box direction="Column" gap="200">
          <Text size="H4">Account Deactivated</Text>
          <Text priority="400">
            Your account has been deactivated. <br/>
          </Text>
          <Text priority="400">
            Should've read the guidelines: <a href="https://moderation.faprealm.com/rules">https://moderation.faprealm.com/rules</a>
          </Text>
        </Box>
      </Box>
    </Dialog>
  );
}
