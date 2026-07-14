import React, { useState } from 'react';
import { useAtomValue } from 'jotai';
import { Box, Avatar, AvatarImage, AvatarFallback, Text, color } from 'folds';
import { Toast, toastsAtom } from '../state/toast';
import { InfoCard } from './info-card';
import * as css from './ToastContainer.css';
import colorMXID from '../../util/colorMXID';
import { nameInitials } from '../utils/common';

function ToastAvatar({ toast }: { toast: Toast }) {
  const [error, setError] = useState(false);

  if (!toast.icon && !toast.fallback) return null;

  return (
    <Avatar size="300">
      {toast.icon && !error ? (
        <AvatarImage src={toast.icon} alt={toast.title} onError={() => setError(true)} />
      ) : (
        <AvatarFallback
          style={{
            backgroundColor: colorMXID(toast.colorId ?? ''),
            color: color.Surface.Container,
          }}
        >
          <Text size="T200">{nameInitials(toast.fallback ?? '')}</Text>
        </AvatarFallback>
      )}
    </Avatar>
  );
}

export function ToastContainer() {
  const toasts = useAtomValue(toastsAtom);

  if (toasts.length === 0) return null;

  return (
    <Box direction="Column" gap="200" className={css.ToastContainer}>
      {toasts.map((toast) => (
        <Box
          key={toast.id}
          className={css.ToastItem}
          style={{ cursor: toast.onClick ? 'pointer' : 'default' }}
          onClick={toast.onClick}
        >
          <InfoCard
            variant="SurfaceVariant"
            title={toast.title}
            description={toast.body}
            before={<ToastAvatar toast={toast} />}
          />
        </Box>
      ))}
    </Box>
  );
}
