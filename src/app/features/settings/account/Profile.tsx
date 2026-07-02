import React, {
  ChangeEventHandler,
  FormEventHandler,
  MouseEventHandler,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  as,
  Box,
  Text,
  IconButton,
  Icon,
  Icons,
  Input,
  Avatar,
  Button,
  Menu,
  MenuItem,
  PopOut,
  RectCords,
  Overlay,
  OverlayBackdrop,
  OverlayCenter,
  Modal,
  Dialog,
  Header,
  config,
  Spinner,
  TextArea,
  toRem,
} from 'folds';
import FocusTrap from 'focus-trap-react';
import { SequenceCard } from '../../../components/sequence-card';
import { SequenceCardStyle } from '../styles.css';
import { SettingTile } from '../../../components/setting-tile';
import { AccountDataEvent } from '../../../../types/matrix/accountData';
import { Method } from 'matrix-js-sdk';
import { useMatrixClient } from '../../../hooks/useMatrixClient';
import { useAccountData } from '../../../hooks/useAccountData';
import {
  getExtendedProfilePath,
  useExtendedProfileNamespace,
  useExtendedProfileSupported,
} from '../../../hooks/useExtendedProfile';
import { getMxIdLocalPart, mxcUrlToHttp } from '../../../utils/matrix';
import { UserAvatar } from '../../../components/user-avatar';
import { useUserProfile, UserProfile } from '../../../hooks/useUserProfile';
import { useMediaAuthentication } from '../../../hooks/useMediaAuthentication';
import { nameInitials } from '../../../utils/common';
import { AsyncStatus, useAsyncCallback } from '../../../hooks/useAsyncCallback';
import { useFilePicker } from '../../../hooks/useFilePicker';
import { useObjectURL } from '../../../hooks/useObjectURL';
import { stopPropagation } from '../../../utils/keyboard';
import { ImageEditor } from '../../../components/image-editor';
import { ModalWide } from '../../../styles/Modal.css';
import { createUploadAtom, UploadSuccess } from '../../../state/upload';
import { CompactUploadCardRenderer } from '../../../components/upload-card';
import { useCapabilities } from '../../../hooks/useCapabilities';

type ProfileProps = {
  profile: UserProfile;
  userId: string;
};
function ProfileAvatar({ profile, userId }: ProfileProps) {
  const mx = useMatrixClient();
  const useAuthentication = useMediaAuthentication();
  const capabilities = useCapabilities();
  const [alertRemove, setAlertRemove] = useState(false);
  const disableSetAvatar = capabilities['m.set_avatar_url']?.enabled === false;

  const defaultDisplayName = profile.displayName ?? getMxIdLocalPart(userId) ?? userId;
  const avatarUrl = profile.avatarUrl
    ? mxcUrlToHttp(mx, profile.avatarUrl, useAuthentication, 96, 96, 'crop') ?? undefined
    : undefined;

  const [imageFile, setImageFile] = useState<File>();
  const imageFileURL = useObjectURL(imageFile);
  const uploadAtom = useMemo(() => {
    if (imageFile) return createUploadAtom(imageFile);
    return undefined;
  }, [imageFile]);

  const pickFile = useFilePicker(setImageFile, false);

  const handleRemoveUpload = useCallback(() => {
    setImageFile(undefined);
  }, []);

  const handleUploaded = useCallback(
    (upload: UploadSuccess) => {
      const { mxc } = upload;
      mx.setAvatarUrl(mxc);
      handleRemoveUpload();
    },
    [mx, handleRemoveUpload]
  );

  const handleRemoveAvatar = () => {
    mx.setAvatarUrl('');
    setAlertRemove(false);
  };

  return (
    <SettingTile
      title={
        <Text as="span" size="L400">
          Avatar
        </Text>
      }
      after={
        <Avatar size="500" radii="300">
          <UserAvatar
            userId={userId}
            src={avatarUrl}
            renderFallback={() => <Text size="H4">{nameInitials(defaultDisplayName)}</Text>}
          />
        </Avatar>
      }
    >
      {uploadAtom ? (
        <Box gap="200" direction="Column">
          <CompactUploadCardRenderer
            uploadAtom={uploadAtom}
            onRemove={handleRemoveUpload}
            onComplete={handleUploaded}
          />
        </Box>
      ) : (
        <Box gap="200">
          <Button
            onClick={() => pickFile('image/*')}
            size="300"
            variant="Secondary"
            fill="Soft"
            outlined
            radii="300"
            disabled={disableSetAvatar}
          >
            <Text size="B300">Upload</Text>
          </Button>
          {avatarUrl && (
            <Button
              size="300"
              variant="Critical"
              fill="None"
              radii="300"
              disabled={disableSetAvatar}
              onClick={() => setAlertRemove(true)}
            >
              <Text size="B300">Remove</Text>
            </Button>
          )}
        </Box>
      )}

      {imageFileURL && (
        <Overlay open={false} backdrop={<OverlayBackdrop />}>
          <OverlayCenter>
            <FocusTrap
              focusTrapOptions={{
                initialFocus: false,
                onDeactivate: handleRemoveUpload,
                clickOutsideDeactivates: true,
                escapeDeactivates: stopPropagation,
              }}
            >
              <Modal className={ModalWide} variant="Surface" size="500">
                <ImageEditor
                  name={imageFile?.name ?? 'Unnamed'}
                  url={imageFileURL}
                  requestClose={handleRemoveUpload}
                />
              </Modal>
            </FocusTrap>
          </OverlayCenter>
        </Overlay>
      )}

      <Overlay open={alertRemove} backdrop={<OverlayBackdrop />}>
        <OverlayCenter>
          <FocusTrap
            focusTrapOptions={{
              initialFocus: false,
              onDeactivate: () => setAlertRemove(false),
              clickOutsideDeactivates: true,
              escapeDeactivates: stopPropagation,
            }}
          >
            <Dialog variant="Surface">
              <Header
                style={{
                  padding: `0 ${config.space.S200} 0 ${config.space.S400}`,
                  borderBottomWidth: config.borderWidth.B300,
                }}
                variant="Surface"
                size="500"
              >
                <Box grow="Yes">
                  <Text size="H4">Remove Avatar</Text>
                </Box>
                <IconButton size="300" onClick={() => setAlertRemove(false)} radii="300">
                  <Icon src={Icons.Cross} />
                </IconButton>
              </Header>
              <Box style={{ padding: config.space.S400 }} direction="Column" gap="400">
                <Box direction="Column" gap="200">
                  <Text priority="400">Are you sure you want to remove profile avatar?</Text>
                </Box>
                <Button variant="Critical" onClick={handleRemoveAvatar}>
                  <Text size="B400">Remove</Text>
                </Button>
              </Box>
            </Dialog>
          </FocusTrap>
        </OverlayCenter>
      </Overlay>
    </SettingTile>
  );
}

function ProfileDisplayName({ profile, userId }: ProfileProps) {
  const mx = useMatrixClient();
  const capabilities = useCapabilities();
  const disableSetDisplayname = capabilities['m.set_displayname']?.enabled === false;

  const defaultDisplayName = profile.displayName ?? getMxIdLocalPart(userId) ?? userId;
  const [displayName, setDisplayName] = useState<string>(defaultDisplayName);

  const [changeState, changeDisplayName] = useAsyncCallback(
    useCallback((name: string) => mx.setDisplayName(name), [mx])
  );
  const changingDisplayName = changeState.status === AsyncStatus.Loading;

  useEffect(() => {
    setDisplayName(defaultDisplayName);
  }, [defaultDisplayName]);

  const handleChange: ChangeEventHandler<HTMLInputElement> = (evt) => {
    const name = evt.currentTarget.value;
    setDisplayName(name);
  };

  const handleReset = () => {
    setDisplayName(defaultDisplayName);
  };

  const handleSubmit: FormEventHandler<HTMLFormElement> = (evt) => {
    evt.preventDefault();
    if (changingDisplayName) return;

    const target = evt.target as HTMLFormElement | undefined;
    const displayNameInput = target?.displayNameInput as HTMLInputElement | undefined;
    const name = displayNameInput?.value;
    if (!name) return;

    changeDisplayName(name);
  };

  const hasChanges = displayName !== defaultDisplayName;
  return (
    <SettingTile
      title={
        <Text as="span" size="L400">
          Display Name
        </Text>
      }
    >
      <Box direction="Column" grow="Yes" gap="100">
        <Box
          as="form"
          onSubmit={handleSubmit}
          gap="200"
          aria-disabled={changingDisplayName || disableSetDisplayname}
        >
          <Box grow="Yes" direction="Column">
            <Input
              required
              name="displayNameInput"
              value={displayName}
              onChange={handleChange}
              variant="Secondary"
              radii="300"
              style={{ paddingRight: config.space.S200 }}
              readOnly={changingDisplayName || disableSetDisplayname}
              after={
                hasChanges &&
                !changingDisplayName && (
                  <IconButton
                    type="reset"
                    onClick={handleReset}
                    size="300"
                    radii="300"
                    variant="Secondary"
                  >
                    <Icon src={Icons.Cross} size="100" />
                  </IconButton>
                )
              }
            />
          </Box>
          <Button
            size="400"
            variant={hasChanges ? 'Success' : 'Secondary'}
            fill={hasChanges ? 'Solid' : 'Soft'}
            outlined
            radii="300"
            disabled={!hasChanges || changingDisplayName}
            type="submit"
          >
            {changingDisplayName && <Spinner variant="Success" fill="Solid" size="300" />}
            <Text size="B400">Save</Text>
          </Button>
        </Box>
      </Box>
    </SettingTile>
  );
}

const GENDER_OPTIONS = [
  { id: 'male', name: 'Male' },
  { id: 'female', name: 'Female' },
  { id: 'trans', name: 'Trans' },
  { id: 'non-binary', name: 'Non-binary' },
  { id: 'other', name: 'Other' },
  { id: 'none', name: 'None' },
];

type GenderSelectorProps = {
  selected: string | undefined;
  onSelect: (genderId: string) => void;
};
const GenderSelector = as<'div', GenderSelectorProps>(({ selected, onSelect, ...props }, ref) => (
  <Menu {...props} ref={ref}>
    <Box direction="Column" gap="100" style={{ padding: config.space.S100 }}>
      {GENDER_OPTIONS.map((option) => (
        <MenuItem
          key={option.id}
          size="300"
          variant={option.id === selected ? 'Primary' : 'Surface'}
          radii="300"
          onClick={() => onSelect(option.id)}
        >
          <Text size="T300">{option.name}</Text>
        </MenuItem>
      ))}
    </Box>
  </Menu>
));

function ProfileGender({ profile }: { profile: UserProfile }) {
  const mx = useMatrixClient();
  const userId = mx.getUserId()!;
  const genderEvent = useAccountData(AccountDataEvent.CinnyGender);
  const extendedProfileNamespace = useExtendedProfileNamespace();
  const [menuCords, setMenuCords] = useState<RectCords>();

  const currentGenderId = genderEvent?.getContent()?.gender;
  const currentGender = GENDER_OPTIONS.find((o) => o.id === currentGenderId) ?? GENDER_OPTIONS[GENDER_OPTIONS.length - 1];

  const [changeState, changeGender] = useAsyncCallback(
    useCallback(
      async (genderId: string) => {
        const newGenderId = genderId === 'none' ? undefined : genderId;

        // Ensure profile exists to avoid Synapse crash (Issue #19702)
        if (!profile.displayName && !profile.avatarUrl) {
          await mx.setDisplayName(getMxIdLocalPart(userId) ?? userId);
        }

        // Save to account data (private fallback)
        await mx.setAccountData(AccountDataEvent.CinnyGender, {
          gender: newGenderId,
        });

        // Save to extended profile (public visibility)
        if (newGenderId) {
          await mx.setExtendedProfileProperty(AccountDataEvent.CinnyGender, newGenderId);
        } else {
          await mx.deleteExtendedProfileProperty(AccountDataEvent.CinnyGender);
        }

        console.log('Saving gender to account data', newGenderId, extendedProfileNamespace);
      },
      [mx, userId, extendedProfileNamespace, profile]
    )
  );
  const changingGender = changeState.status === AsyncStatus.Loading;

  const handleGenderMenu: MouseEventHandler<HTMLButtonElement> = (evt) => {
    setMenuCords(evt.currentTarget.getBoundingClientRect());
  };

  const handleGenderSelect = (genderId: string) => {
    changeGender(genderId);
    setMenuCords(undefined);
  };

  return (
    <SettingTile
      title={
        <Text as="span" size="L400">
          Gender
        </Text>
      }
      after={
        <>
          <Button
            size="300"
            variant="Secondary"
            outlined
            fill="Soft"
            radii="300"
            disabled={changingGender}
            after={
              changingGender ? (
                <Spinner size="300" />
              ) : (
                <Icon size="300" src={Icons.ChevronBottom} />
              )
            }
            onClick={handleGenderMenu}
          >
            <Text size="T300">{currentGender.name}</Text>
          </Button>
          <PopOut
            anchor={menuCords}
            offset={5}
            position="Bottom"
            align="End"
            content={
              <FocusTrap
                focusTrapOptions={{
                  initialFocus: false,
                  onDeactivate: () => setMenuCords(undefined),
                  clickOutsideDeactivates: true,
                  isKeyForward: (evt: KeyboardEvent) =>
                    evt.key === 'ArrowDown' || evt.key === 'ArrowRight',
                  isKeyBackward: (evt: KeyboardEvent) =>
                    evt.key === 'ArrowUp' || evt.key === 'ArrowLeft',
                  escapeDeactivates: stopPropagation,
                }}
              >
                <GenderSelector selected={currentGenderId} onSelect={handleGenderSelect} />
              </FocusTrap>
            }
          />
        </>
      }
    />
  );
}

function ProfileAboutMe({ profile }: { profile: UserProfile }) {
  const mx = useMatrixClient();
  const userId = mx.getUserId()!;
  const aboutMeEvent = useAccountData(AccountDataEvent.CinnyAboutMe);

  const defaultAboutMe = aboutMeEvent?.getContent()?.aboutMe ?? '';
  const [aboutMe, setAboutMe] = useState<string>(defaultAboutMe);

  const [changeState, changeAboutMe] = useAsyncCallback(
    useCallback(
      async (text: string) => {
        const newAboutMe = text.trim() || undefined;

        // Ensure profile exists to avoid Synapse crash (Issue #19702)
        if (!profile.displayName && !profile.avatarUrl) {
          await mx.setDisplayName(getMxIdLocalPart(userId) ?? userId);
        }

        // Save to account data (private fallback)
        await mx.setAccountData(AccountDataEvent.CinnyAboutMe, {
          aboutMe: newAboutMe,
        });

        // Save to extended profile (public visibility)
        if (newAboutMe) {
          await mx.setExtendedProfileProperty(AccountDataEvent.CinnyAboutMe, newAboutMe);
        } else {
          await mx.deleteExtendedProfileProperty(AccountDataEvent.CinnyAboutMe);
        }
      },
      [mx, userId, profile]
    )
  );
  const changingAboutMe = changeState.status === AsyncStatus.Loading;

  useEffect(() => {
    setAboutMe(defaultAboutMe);
  }, [defaultAboutMe]);

  const handleChange: ChangeEventHandler<HTMLTextAreaElement> = (evt) => {
    setAboutMe(evt.currentTarget.value.slice(0, 500));
  };

  const handleReset = () => {
    setAboutMe(defaultAboutMe);
  };

  const handleSubmit: FormEventHandler<HTMLFormElement> = (evt) => {
    evt.preventDefault();
    if (changingAboutMe) return;

    changeAboutMe(aboutMe);
  };

  const hasChanges = aboutMe !== defaultAboutMe;

  return (
    <SettingTile
      title={
        <Text as="span" size="L400">
          About me
        </Text>
      }
    >
      <Box direction="Column" grow="Yes" gap="100">
        <Box
          as="form"
          onSubmit={handleSubmit}
          gap="200"
          aria-disabled={changingAboutMe}
        >
          <Box grow="Yes" direction="Column" gap="100">
            <TextArea
              name="aboutMeInput"
              value={aboutMe}
              onChange={handleChange}
              variant="Secondary"
              radii="300"
              placeholder="Tell others about yourself..."
              readOnly={changingAboutMe}
              style={{
                minHeight: toRem(80),
                padding: config.space.S200,
              }}
            />
            <Box style={{ padding: `0 ${config.space.S100}` }}>
              <Text size="T200" priority="300">
                {aboutMe.length}/500
              </Text>
            </Box>
          </Box>
          <Button
            size="400"
            variant={hasChanges ? 'Success' : 'Secondary'}
            fill={hasChanges ? 'Solid' : 'Soft'}
            outlined
            radii="300"
            disabled={!hasChanges || changingAboutMe}
            type="submit"
          >
            {changingAboutMe && <Spinner variant="Success" fill="Solid" size="300" />}
            <Text size="B400">Save</Text>
          </Button>
        </Box>
      </Box>
    </SettingTile>
  );
}

export function Profile() {
  const mx = useMatrixClient();
  const userId = mx.getUserId()!;
  const profile = useUserProfile(userId);

  return (
    <Box direction="Column" gap="100">
      <Text size="L400">Profile</Text>
      <SequenceCard
        className={SequenceCardStyle}
        variant="SurfaceVariant"
        direction="Column"
        gap="400"
      >
        <ProfileAvatar userId={userId} profile={profile} />
        <ProfileGender profile={profile} />
        <ProfileAboutMe profile={profile} />
      </SequenceCard>
    </Box>
  );
}
