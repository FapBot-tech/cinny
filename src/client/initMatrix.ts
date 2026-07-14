import { createClient, MatrixClient, IndexedDBStore, IndexedDBCryptoStore } from 'matrix-js-sdk';

import { getSettings } from '../app/state/settings';
import { cryptoCallbacks } from './secretStorageKeys';
import { clearNavToActivePathStore } from '../app/state/navToActivePath';
import { pushSessionToSW } from '../sw-session';

type Session = {
  baseUrl: string;
  accessToken: string;
  userId: string;
  deviceId: string;
};

export const initClient = async (session: Session): Promise<MatrixClient> => {
  const indexedDBStore = new IndexedDBStore({
    indexedDB: global.indexedDB,
    localStorage: global.localStorage,
    dbName: `sync-${session.userId}-${session.deviceId}`,
  });

  const legacyCryptoStore = new IndexedDBCryptoStore(
    global.indexedDB,
    `crypto-${session.userId}-${session.deviceId}`
  );

  const mx = createClient({
    baseUrl: session.baseUrl,
    accessToken: session.accessToken,
    userId: session.userId,
    store: indexedDBStore,
    cryptoStore: legacyCryptoStore,
    deviceId: session.deviceId,
    timelineSupport: true,
    cryptoCallbacks: cryptoCallbacks as any,
    verificationMethods: ['m.sas.v1'],
  });

  await indexedDBStore.startup();
  await mx.initRustCrypto({
    cryptoDatabasePrefix: `rust-crypto-${session.userId}-${session.deviceId}`,
  });

  mx.setMaxListeners(50);
  const handleSuspended = (err: any) => {
    if (err.errcode === 'M_USER_SUSPENDED' || (err.data && err.data.errcode === 'M_USER_SUSPENDED')) {
      mx.emit('account_suspended' as any, err);
    }
  };

  const originalAuthedRequest = mx.http.authedRequest.bind(mx.http);
  mx.http.authedRequest = async function (...args: any[]) {
    try {
      return await originalAuthedRequest(...args);
    } catch (err) {
      handleSuspended(err);
      throw err;
    }
  };

  const originalRequest = mx.http.request.bind(mx.http);
  mx.http.request = async function (...args: any[]) {
    try {
      return await originalRequest(...args);
    } catch (err) {
      handleSuspended(err);
      throw err;
    }
  };

  return mx;
};

export const startClient = async (mx: MatrixClient) => {
  const { sendPresence } = getSettings();
  await mx.startClient({
    lazyLoadMembers: true,
    presence: sendPresence ? 'online' : 'offline',
  });
};

export const clearCacheAndReload = async (mx: MatrixClient) => {
  mx.stopClient();
  clearNavToActivePathStore(mx.getSafeUserId());
  await mx.store.deleteAllData();
  window.location.reload();
};

export const logoutClient = async (mx: MatrixClient) => {
  pushSessionToSW();
  mx.stopClient();
  try {
    await mx.logout();
  } catch {
    // ignore if failed to logout
  }
  await mx.clearStores();
  window.localStorage.clear();
  window.location.reload();
};

export const clearLoginData = async () => {
  const dbs = await window.indexedDB.databases();

  dbs.forEach((idbInfo) => {
    const { name } = idbInfo;
    if (name) {
      window.indexedDB.deleteDatabase(name);
    }
  });

  window.localStorage.clear();
  window.location.reload();
};
