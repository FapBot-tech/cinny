import { useCallback } from 'react';
import z from 'zod';
import { useQuery } from '@tanstack/react-query';
import { Capabilities } from 'matrix-js-sdk';
import { useMatrixClient } from './useMatrixClient';
import { useSpecVersions } from './useSpecVersions';
import { IProfileFieldsCapability } from '../../types/matrix/common';

const extendedProfile = z.looseObject({
    displayname: z.string().optional(),
    avatar_url: z.string().optional(),
    'io.fsky.nyx.pronouns': z
        .object({
            language: z.string(),
            summary: z.string(),
        })
        .array()
        .optional()
        .catch(undefined),
    'in.cinny.gender': z.string().optional().catch(undefined),
    'in.cinny.about_me': z.string().optional().catch(undefined),
    'us.cloke.msc4175.tz': z.string().optional().catch(undefined),
});

export type ExtendedProfile = z.infer<typeof extendedProfile>;

export const MSC4133_NAMESPACES = [
  'org.matrix.msc4133',
  'uk.tcpip.msc4133',
    'uk.tcpip.msc4133.stable',
] as const;

export function useExtendedProfileNamespace(): typeof MSC4133_NAMESPACES[number] | undefined {
  const { versions, unstable_features: unstableFeatures } = useSpecVersions();

  if (unstableFeatures?.['org.matrix.msc4133']) return 'org.matrix.msc4133';
  if (unstableFeatures?.['uk.tcpip.msc4133.stable']) return 'uk.tcpip.msc4133.stable';
  if (unstableFeatures?.['uk.tcpip.msc4133']) return 'uk.tcpip.msc4133';
  if (versions.includes('v1.15')) return 'org.matrix.msc4133';

  return undefined;
}

export function getExtendedProfilePath(userId: string, namespace: typeof MSC4133_NAMESPACES[number]): string {
  const encodedUserId = encodeURIComponent(userId);
  if (namespace === 'uk.tcpip.msc4133.stable') {
    return `/profile/${encodedUserId}/${namespace}`;
  }
  return `/profile/${encodedUserId}/unstable/${namespace}`;
}

export function useExtendedProfileSupported(): boolean {
  return useExtendedProfileNamespace() !== undefined;
}

/// Returns the user's MSC4133 extended profile, if our homeserver supports it.
/// This will return `undefined` while the request is in flight and `null` if the HS lacks support.
export function useExtendedProfile(
    userId: string
): [ExtendedProfile | undefined, () => Promise<void>] {
    const mx = useMatrixClient();
    const { data, refetch } = useQuery({
        queryKey: ['extended-profile', userId],
        queryFn: useCallback(async () => {
            try {
                return mx.getExtendedProfile(userId);
            } catch {
                return {};
            }
        }, [mx, userId]),
        refetchOnMount: 'always',
    });

    return [
        data,
        async () => {
            await refetch();
        },
    ];
}

const LEGACY_FIELDS = ['displayname', 'avatar_url'];

/// Returns whether the given profile field may be edited by the user.
export function profileEditsAllowed(
    field: string,
    capabilities: Capabilities,
    extendedProfileSupported: boolean
): boolean {
    if (LEGACY_FIELDS.includes(field)) {
        // this field might have a pre-msc4133 capability. check that first
        if (capabilities[`m.set_${field}`]?.enabled === false) {
            return false;
        }

        if (!extendedProfileSupported) {
            // the homeserver only supports legacy fields
            return true;
        }
    }

    if (extendedProfileSupported) {
        // the homeserver has msc4133 support
        let extendedProfileCapability: IProfileFieldsCapability | undefined;
        for (const ns of MSC4133_NAMESPACES) {
            extendedProfileCapability = capabilities[
                `${ns}.profile_fields`
                ] as IProfileFieldsCapability;
            if (extendedProfileCapability !== undefined) break;
        }

        if (extendedProfileCapability === undefined) {
            // the capability is missing, assume modification is allowed
            return true;
        }

        if (!extendedProfileCapability.enabled) {
            // the capability is set to disable profile modifications
            return false;
        }

        if (
            extendedProfileCapability.allowed !== undefined &&
            !extendedProfileCapability.allowed.includes(field)
        ) {
            // the capability includes an allowlist and `field` isn't in it
            return false;
        }

        if (extendedProfileCapability.disallowed?.includes(field)) {
            // the capability includes an blocklist and `field` is in it
            return false;
        }

        // the capability is enabled and `field` isn't blocked
        return true;
    }

    // `field` is an extended profile key and the homeserver lacks msc4133 support
    return false;
}
