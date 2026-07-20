import { MatrixClient, ClientEvent } from 'matrix-js-sdk';
import { useEffect, useRef } from 'react';
import { useAtom } from 'jotai';
import { settingsAtom, Settings } from '../state/settings';
import { useMatrixClient } from '../hooks/useMatrixClient';

const SETTINGS_ACCOUNT_DATA_TYPE = 'cinny.settings';

export const SettingsSync = () => {
  const mx = useMatrixClient();
  const [settings, setSettings] = useAtom(settingsAtom);
  const isInitialLoad = useRef(true);

  // Push settings to server when they change
  useEffect(() => {
    if (mx && mx.clientRunning) {
      if (isInitialLoad.current) {
        return;
      }
      const pushSettings = async () => {
        try {
          await mx.setAccountData(SETTINGS_ACCOUNT_DATA_TYPE, settings);
        } catch (e) {
          console.error('Failed to push settings to server', e);
        }
      };
      pushSettings();
    }
  }, [mx, settings]);

  // Load settings from server on login/init
  useEffect(() => {
    if (!mx) return;

    const loadSettings = (isFinalAttempt = false) => {
      const event = mx.getAccountData(SETTINGS_ACCOUNT_DATA_TYPE);
      if (event) {
        const remoteSettings = event.getContent() as Settings;
        if (!remoteSettings || typeof remoteSettings !== 'object' || Object.keys(remoteSettings).length === 0) {
          isInitialLoad.current = false;
          return;
        }
        setSettings((localSettings) => {
          if (!localSettings) return remoteSettings;
          
          // Merge remote settings into local settings, but keep local privacy settings
          // until we are sure it has been synchronized or if it's the very first load.
          const merged = { ...localSettings, ...remoteSettings };
          if (isInitialLoad.current) {
            merged.sendPresence = localSettings.sendPresence;
            merged.sendTypingNotifications = localSettings.sendTypingNotifications;
            merged.sendReadReceipts = localSettings.sendReadReceipts;
          }
          
          // If settings are identical, return the same object to avoid re-renders
          if (JSON.stringify(localSettings) === JSON.stringify(merged)) {
            return localSettings;
          }
          return merged;
        });

        // We only set isInitialLoad to false after the first successful merge
        setTimeout(() => {
          isInitialLoad.current = false;
        }, 0);
      } else if (isFinalAttempt) {
        isInitialLoad.current = false;
      }
    };

    const handleAccountData = (event: any) => {
      if (event.getType() === SETTINGS_ACCOUNT_DATA_TYPE) {
        loadSettings();
      }
    };

    mx.on(ClientEvent.AccountData, handleAccountData);
    if (mx.clientRunning) {
      loadSettings(true);
    } else {
      mx.once(ClientEvent.Sync, (state, prevState) => {
        if (
          (state === 'PREPARED' || state === 'SYNCING') &&
          prevState !== 'PREPARED' &&
          prevState !== 'SYNCING'
        ) {
          loadSettings(true);
        }
      });
    }

    return () => {
      mx.removeListener(ClientEvent.AccountData, handleAccountData);
    };
  }, [mx, setSettings]);

  return null;
};
