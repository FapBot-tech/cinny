import React, { ReactNode } from 'react';
import { as, Avatar, Box, Icon, Icons, Text } from 'folds';
import { MatrixClient, Room, RoomMember } from 'matrix-js-sdk';
import { getMemberDisplayName } from '../../utils/room';
import { getMxIdLocalPart } from '../../utils/matrix';
import { UserAvatar } from '../user-avatar';
import { useUserPresence, Presence } from '../../hooks/useUserPresence';
import { AvatarPresence, PresenceBadge } from '../presence';
import { useExtendedProfile } from '../../hooks/useExtendedProfile';
import { getGenderAbbreviation, getGenderIcon } from '../../utils/gender';
import { AccountDataEvent } from '../../../types/matrix/accountData';
import * as css from './style.css';

const getName = (room: Room, member: RoomMember) =>
  getMemberDisplayName(room, member.userId) ?? getMxIdLocalPart(member.userId) ?? member.userId;

type MemberTileProps = {
  mx: MatrixClient;
  room: Room;
  member: RoomMember;
  useAuthentication: boolean;
  after?: ReactNode;
};
export const MemberTile = as<'button', MemberTileProps>(
  ({ as: AsMemberTile = 'button', mx, room, member, useAuthentication, after, ...props }, ref) => {
    const [extendedProfile] = useExtendedProfile(member.userId);
    const presence = useUserPresence(member.userId);
    const genderData = (extendedProfile as any)?.[AccountDataEvent.CinnyGender];
    const genderId = typeof genderData === 'string' ? genderData : genderData?.gender ?? '';

    const name = getName(room, member);
    const username = getMxIdLocalPart(member.userId);

    const avatarMxcUrl = member.getMxcAvatarUrl();
    const avatarUrl = avatarMxcUrl
      ? mx.mxcUrlToHttp(avatarMxcUrl, 100, 100, 'crop', undefined, false, useAuthentication)
      : undefined;

    return (
      <AsMemberTile className={css.MemberTile} {...props} ref={ref}>
        <AvatarPresence
          badge={
            presence?.presence === Presence.Online && (
              <PresenceBadge presence={presence.presence} size="300" />
            )
          }
        >
          <Avatar size="300" radii="400">
            <UserAvatar
              userId={member.userId}
              src={avatarUrl ?? undefined}
              alt={name}
              renderFallback={() => <Icon size="300" src={Icons.User} filled />}
            />
          </Avatar>
        </AvatarPresence>
        <Box grow="Yes" as="span" direction="Column">
          <Box as="span" direction="Row" alignItems="Center" justifyContent="SpaceBetween" gap="300">
            <Text as="span" size="T300" truncate>
              <b>{name}</b>
            </Text>
            {genderId && (
              <Box direction="Row" alignItems="Center" gap="50">
                <Text size="T200" priority="300" variant="Secondary">
                  {getGenderAbbreviation(genderId)}
                </Text>
                <Icon className={css.GenderIcon} src={getGenderIcon(genderId)} priority="300" />
              </Box>
            )}
          </Box>
          <Box alignItems="Center" justifyContent="SpaceBetween" gap="100">
            <Text as="span" size="T200" priority="300" truncate>
              {username}
            </Text>
          </Box>
        </Box>
        {after}
      </AsMemberTile>
    );
  }
);
