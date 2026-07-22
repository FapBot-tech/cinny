import {
  createClient,
  MatrixClient,
  IndexedDBStore,
  IndexedDBCryptoStore,
  EventType,
  User,
  Filter,
  SyncState,
  ClientEvent,
  UserEvent,
} from 'matrix-js-sdk';
import { SlidingSync, ExtensionState } from 'matrix-js-sdk/lib/sliding-sync';
import { SlidingSyncSdk } from 'matrix-js-sdk/lib/sliding-sync-sdk';

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

class PresenceSync {
  private syncToken?: string;

  private running = false;

  private abortController?: AbortController;

  private reEmittingUserIds = new Set<string>();

  constructor(private client: MatrixClient) {}

  public async start() {
    if (this.running) return;
    this.running = true;

    while (this.running) {
      this.abortController = new AbortController();
      try {
        const filter = new Filter(this.client.getUserId()!);
        filter.setDefinition({
          room: {
            state: { limit: 0 },
            timeline: { limit: 0 },
            include_leave: false,
          },
          presence: { types: ['m.presence'] },
        });

        const filterId = await this.client.getOrCreateFilter(
          `presence_${this.client.getUserId()}`,
          filter
        );

        const response = await this.client.http.authedRequest<any>(
          'GET',
          '/sync',
          {
            filter: filterId,
            since: this.syncToken,
            timeout: 30000,
            set_presence: getSettings().sendPresence ? 'online' : 'offline',
          },
          undefined,
          { abortSignal: this.abortController.signal }
        );

        this.syncToken = response.next_batch;
        this.processPresence(response.presence?.events);
      } catch (err: any) {
        if (err.name === 'AbortError') continue;
        console.error('Presence sync error', err);
        await new Promise((resolve) => {
          setTimeout(resolve, 5000);
        });
      }
    }
  }

  public stop() {
    this.running = false;
    this.abortController?.abort();
  }

  private processPresence(events?: any[]) {
    if (!events) return;
    const mapper = this.client.getEventMapper();
    events.forEach((rawEvent) => {
      if (rawEvent.type !== 'm.presence') return;
      const event = mapper(rawEvent);
      const userId = event.getSender() || event.getContent().user_id;
      if (userId) {
        let user = this.client.getUser(userId);
        if (!user) {
          user = User.createUser(userId, this.client);
          this.client.store.storeUser(user);
          this.reEmittingUserIds.add(userId);
        }

        if (!this.reEmittingUserIds.has(userId)) {
          this.client.reEmitter.reEmit(user, [
            UserEvent.Presence,
            UserEvent.CurrentlyActive,
            UserEvent.LastPresenceTs,
          ]);
          this.reEmittingUserIds.add(userId);
        }

        // Link user to room members across all rooms
        this.client.getRooms().forEach((room) => {
          const member = room.getMember(userId);
          if (member && !member.user) {
            member.user = user!;
          }
        });

        user.setPresenceEvent(event);
      }
      this.client.emit('event' as any, event);
    });
  }
}

const presenceSyncByClient = new WeakMap<MatrixClient, PresenceSync>();

const SLIDING_SYNC_CONN_ID = 'cinny-main';

function installSlidingSyncRequestPatch(mx: MatrixClient): void {
  const original = mx.slidingSync.bind(mx);
  mx.slidingSync = (reqBody: any, baseUrl?: string, abortSignal?: AbortSignal) => {
    if (reqBody.conn_id === undefined) {
      reqBody.conn_id = SLIDING_SYNC_CONN_ID;
    }
    return original(reqBody, baseUrl, abortSignal);
  };
}

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
  installSlidingSyncRequestPatch(mx);
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

  const requiredState: [string, string][] = [
    [EventType.RoomAvatar, ''],
    [EventType.RoomTombstone, ''],
    [EventType.RoomEncryption, ''],
    [EventType.RoomCreate, ''],
    [EventType.RoomName, ''],
    [EventType.RoomCanonicalAlias, ''],
    [EventType.RoomTopic, ''],
    [EventType.RoomJoinRules, ''],
    [EventType.RoomPowerLevels, ''],
    [EventType.RoomHistoryVisibility, ''],
    [EventType.RoomGuestAccess, ''],
    [EventType.RoomPinnedEvents, ''],
    [EventType.SpaceChild, ''],
    [EventType.SpaceParent, ''],
    ['in.cinny.room.power_level_tags', ''],
    [EventType.GroupCallPrefix, ''],
    [EventType.RoomMember, '$ME'],
  ];

  const lists = new Map([
    [
      'joined',
      {
        ranges: [[0, 250]],
        sort: ['by_notification_level', 'by_recency'],
        timeline_limit: 20,
        required_state: requiredState,
        filters: { is_invite: false },
      },
    ],
    [
      'invites',
      {
        ranges: [[0, 20]],
        sort: ['by_notification_level', 'by_recency'],
        timeline_limit: 0,
        required_state: requiredState,
        filters: { is_invite: true },
      },
    ],
  ]);

  const slidingSync = new SlidingSync(
    mx.baseUrl,
    lists,
    { required_state: requiredState, timeline_limit: 20 },
    mx,
    30000
  );

  const presenceSync = new PresenceSync(mx);
  presenceSyncByClient.set(mx, presenceSync);

  const onSync = (state: SyncState) => {
    if (state === SyncState.Prepared || state === SyncState.Syncing) {
      presenceSync.start();
    }
  };
  mx.on(ClientEvent.Sync, onSync);

  await mx.startClient({
    lazyLoadMembers: true,
    presence: sendPresence ? 'online' : 'offline',
    slidingSync,
  });
};

export const clearCacheAndReload = async (mx: MatrixClient) => {
  mx.stopClient();
  presenceSyncByClient.get(mx)?.stop();
  presenceSyncByClient.delete(mx);
  clearNavToActivePathStore(mx.getSafeUserId());
  await mx.store.deleteAllData();
  window.location.reload();
};

export const logoutClient = async (mx: MatrixClient) => {
  pushSessionToSW();
  mx.stopClient();
  presenceSyncByClient.get(mx)?.stop();
  presenceSyncByClient.delete(mx);
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
