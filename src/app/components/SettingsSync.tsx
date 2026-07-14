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

    const loadSettings = () => {
      const event = mx.getAccountData(SETTINGS_ACCOUNT_DATA_TYPE);
      if (event) {
        const remoteSettings = event.getContent() as Settings;
        if (!remoteSettings || typeof remoteSettings !== 'object' || Object.keys(remoteSettings).length === 0) {
          isInitialLoad.current = false;
          return;
        }
        setSettings((localSettings) => {
          if (!localSettings) return remoteSettings;
          const newSettings = { ...localSettings, ...remoteSettings };
          // If settings are identical, return the same object to avoid re-renders
          if (JSON.stringify(localSettings) === JSON.stringify(newSettings)) {
            return localSettings;
          }
          return newSettings;
        });
      }
      isInitialLoad.current = false;
    };

    const handleAccountData = (event: any) => {
      if (event.getType() === SETTINGS_ACCOUNT_DATA_TYPE) {
        loadSettings();
      }
    };

    mx.on(ClientEvent.AccountData, handleAccountData);
    if (mx.clientRunning) {
      loadSettings();
    } else {
      mx.once(ClientEvent.Sync, (state) => {
        if (state === 'PREPARED' || state === 'SYNCING') {
          loadSettings();
        }
      });
    }

    return () => {
      mx.removeListener(ClientEvent.AccountData, handleAccountData);
    };
  }, [mx, setSettings]);

  return null;
};
