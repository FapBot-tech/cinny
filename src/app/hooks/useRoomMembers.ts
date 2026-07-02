import {
  MatrixClient,
  MatrixEvent,
  RoomMember,
  RoomMemberEvent,
  User,
  UserEvent,
} from 'matrix-js-sdk';
import { useEffect, useState } from 'react';

export const useRoomMembers = (mx: MatrixClient, roomId: string): RoomMember[] => {
  const [members, setMembers] = useState<RoomMember[]>([]);

  useEffect(() => {
    const room = mx.getRoom(roomId);
    let loadingMembers = true;
    let disposed = false;

    const updateMemberList = (event?: MatrixEvent) => {
      if (!room || disposed || (event && event.getRoomId() !== roomId)) return;
      if (loadingMembers) return;
      setMembers([...room.getMembers()]);
    };

    const onUserPresence = (event: MatrixEvent, user: User) => {
      if (disposed || !room) return;
      if (room.getMember(user.userId)) {
        updateMemberList();
      }
    };

    if (room) {
      setMembers(room.getMembers());
      room.loadMembersIfNeeded().then(() => {
        loadingMembers = false;
        if (disposed) return;
        updateMemberList();
      });
    }

    mx.on(RoomMemberEvent.Membership, updateMemberList);
    mx.on(RoomMemberEvent.PowerLevel, updateMemberList);
    mx.on(UserEvent.Presence, onUserPresence);
    mx.on(UserEvent.CurrentlyActive, onUserPresence);
    mx.on(UserEvent.LastPresenceTs, onUserPresence);
    return () => {
      disposed = true;
      mx.removeListener(RoomMemberEvent.Membership, updateMemberList);
      mx.removeListener(RoomMemberEvent.PowerLevel, updateMemberList);
      mx.removeListener(UserEvent.Presence, onUserPresence);
      mx.removeListener(UserEvent.CurrentlyActive, onUserPresence);
      mx.removeListener(UserEvent.LastPresenceTs, onUserPresence);
    };
  }, [mx, roomId]);

  return members;
};
