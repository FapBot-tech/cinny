import { Box, Button, config, Icon, Icons, Text } from 'folds';
import React from 'react';
import { useNavigate } from 'react-router-dom';
import Linkify from 'linkify-react';
import { LINKIFY_OPTS } from '../../plugins/react-custom-html-parser';
import { UserHero, UserHeroName } from './UserHero';
import { AccountDataEvent } from '../../../types/matrix/accountData';
import { useMatrixClient } from '../../hooks/useMatrixClient';
import { useAccountData } from '../../hooks/useAccountData';
import { useExtendedProfile } from '../../hooks/useExtendedProfile';
import { useMediaAuthentication } from '../../hooks/useMediaAuthentication';
import { useUserPresence } from '../../hooks/useUserPresence';
import { useRoom } from '../../hooks/useRoom';
import { usePowerLevels } from '../../hooks/usePowerLevels';
import { getMxIdLocalPart, getMxIdServer, mxcUrlToHttp, getDMRoomFor } from '../../utils/matrix';
import { getMemberAvatarMxc, getMemberDisplayName } from '../../utils/room';
import { useCloseUserRoomProfile } from '../../state/hooks/userRoomProfile';
import { PowerChip } from './PowerChip';
import { UserInviteAlert, UserBanAlert, UserModeration, UserKickAlert } from './UserModeration';
import { useIgnoredUsers } from '../../hooks/useIgnoredUsers';
import { useMembership } from '../../hooks/useMembership';
import { Membership } from '../../../types/matrix/room';
import { useRoomCreators } from '../../hooks/useRoomCreators';
import { useRoomPermissions } from '../../hooks/useRoomPermissions';
import { useMemberPowerCompare } from '../../hooks/useMemberPowerCompare';
import { CreatorChip } from './CreatorChip';
import { ServerChip, ShareChip, MutualRoomsChip, OptionsChip, IgnoredUserAlert } from './UserChips';
import { getDirectCreatePath, getDirectRoomPath, withSearchParam } from '../../pages/pathUtils';
import { DirectCreateSearchParams } from '../../pages/paths';
import { getGenderIcon } from '../../utils/gender';
import { useDirectRooms } from '../../pages/client/direct/useDirectRooms';

type UserRoomProfileProps = {
  userId: string;
};
export function UserRoomProfile({ userId }: UserRoomProfileProps) {
  const mx = useMatrixClient();
  const useAuthentication = useMediaAuthentication();
  const navigate = useNavigate();
  const closeUserRoomProfile = useCloseUserRoomProfile();
  const ignoredUsers = useIgnoredUsers();
  const ignored = ignoredUsers.includes(userId);
  const directs = useDirectRooms();

  const room = useRoom();
  const powerLevels = usePowerLevels(room);
  const creators = useRoomCreators(room);

  const permissions = useRoomPermissions(creators, powerLevels);
  const { hasMorePower } = useMemberPowerCompare(creators, powerLevels);

  const myUserId = mx.getSafeUserId();
  const creator = creators.has(userId);

  const canKickUser = permissions.action('kick', myUserId) && hasMorePower(myUserId, userId);
  const canBanUser = permissions.action('ban', myUserId) && hasMorePower(myUserId, userId);
  const canUnban = permissions.action('ban', myUserId);
  const canInvite = permissions.action('invite', myUserId);

  const member = room.getMember(userId);
  const membership = useMembership(room, userId);

  const server = getMxIdServer(userId);
  const displayName = getMemberDisplayName(room, userId);
  const avatarMxc = getMemberAvatarMxc(room, userId);
  const avatarUrl = (avatarMxc && mxcUrlToHttp(mx, avatarMxc, useAuthentication)) ?? undefined;

  const presence = useUserPresence(userId);
  const [extendedProfile] = useExtendedProfile(userId);
  const genderId = extendedProfile?.[AccountDataEvent.CinnyGender] ?? '';
  const gender = genderId
    ? genderId.charAt(0).toUpperCase() + genderId.slice(1).replace(/-/g, ' ')
    : undefined;
  const aboutMe = extendedProfile?.[AccountDataEvent.CinnyAboutMe];

  const handleMessage = () => {
    closeUserRoomProfile();

    const dmRoomId = directs.find((roomId) => mx.getRoom(roomId)?.getMember(userId));
    if (dmRoomId) {
      navigate(getDirectRoomPath(dmRoomId));
      return;
    }

    const dmRoom = getDMRoomFor(mx, userId);
    if (dmRoom) {
      navigate(getDirectRoomPath(dmRoom.roomId));
      return;
    }

    const directSearchParam: DirectCreateSearchParams = {
      userId,
    };
    navigate(withSearchParam(getDirectCreatePath(), directSearchParam));
  };

  return (
    <Box direction="Column">
      <UserHero
        userId={userId}
        avatarUrl={avatarUrl}
        presence={presence && presence.lastActiveTs !== 0 ? presence : undefined}
      />
      <Box direction="Column" gap="500" style={{ padding: config.space.S400 }}>
        <Box direction="Column" gap="400">
          <Box gap="400" alignItems="Start">
            <UserHeroName displayName={displayName} userId={userId} />
            {userId !== myUserId && (
              <Box shrink="No">
                <Button
                  size="300"
                  variant="Primary"
                  fill="Solid"
                  radii="300"
                  before={<Icon size="50" src={Icons.Message} filled />}
                  onClick={handleMessage}
                >
                  <Text size="B300">Message</Text>
                </Button>
              </Box>
            )}
          </Box>
          {gender && (
            <Box alignItems="Center" gap="100">
              <Icon size="50" src={getGenderIcon(genderId)} />
              <Text size="T200" priority="300">
                {gender}
              </Text>
            </Box>
          )}
          {aboutMe && (
            <Text size="T200" priority="300" style={{ wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}>
              <Linkify options={LINKIFY_OPTS}>{aboutMe}</Linkify>
            </Text>
          )}
          <Box alignItems="Center" gap="200" wrap="Wrap">
            {server && <ServerChip server={server} />}
            <ShareChip userId={userId} />
            {creator ? <CreatorChip /> : <PowerChip userId={userId} />}
            {userId !== myUserId && <MutualRoomsChip userId={userId} />}
            {userId !== myUserId && <OptionsChip userId={userId} />}
          </Box>
        </Box>
        {ignored && <IgnoredUserAlert />}
        {member && membership === Membership.Ban && (
          <UserBanAlert
            userId={userId}
            reason={member.events.member?.getContent().reason}
            canUnban={canUnban}
            bannedBy={member.events.member?.getSender()}
            ts={member.events.member?.getTs()}
          />
        )}
        {member &&
          membership === Membership.Leave &&
          member.events.member &&
          member.events.member.getSender() !== userId && (
            <UserKickAlert
              reason={member.events.member?.getContent().reason}
              kickedBy={member.events.member?.getSender()}
              ts={member.events.member?.getTs()}
            />
          )}
        {member && membership === Membership.Invite && (
          <UserInviteAlert
            userId={userId}
            reason={member.events.member?.getContent().reason}
            canKick={canKickUser}
            invitedBy={member.events.member?.getSender()}
            ts={member.events.member?.getTs()}
          />
        )}
        <UserModeration
          userId={userId}
          canInvite={canInvite && membership === Membership.Leave}
          canKick={canKickUser && membership === Membership.Join}
          canBan={canBanUser && membership !== Membership.Ban}
        />
      </Box>
    </Box>
  );
}
