import { style } from '@vanilla-extract/css';
import { DefaultReset, color, config, toRem } from 'folds';

export const UrlPreview = style([
  DefaultReset,
  {
    width: 'auto',
    maxWidth: '100%',
    objectFit: 'contain',
    minHeight: toRem(102),
    backgroundColor: color.SurfaceVariant.Container,
    color: color.SurfaceVariant.OnContainer,
    border: `${config.borderWidth.B300} solid ${color.SurfaceVariant.ContainerLine}`,
    borderRadius: config.radii.R300,
    overflow: 'hidden',
  },
]);

export const UrlPreviewImg = style([
  DefaultReset,
  {
    width: 'auto',
    maxWidth: '30vw',
    height: 'auto',
    maxHeight: 'clamp(250px, 30vh, 40vh)',
    objectFit: 'cover',
    objectPosition: 'center',
    flexShrink: 0,
    overflow: 'hidden',
    minHeight: '15vh',
    cursor: 'pointer',

    ':hover': {
      filter: 'brightness(0.8)',
    },
  },
]);

export const UrlPreviewContent = style([
  DefaultReset,
  {
    padding: config.space.S200,
  },
]);

export const UrlPreviewDescription = style([
  DefaultReset,
  {
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
  },
]);

export const UrlPreviewHeroImg = style([
  DefaultReset,
  {
    width: '100%',
    maxWidth: '90vw',
    maxHeight: toRem(300),
    objectFit: 'contain',
    backgroundColor: '#000',
    cursor: 'pointer',
  },
]);

export const UrlPreviewCardRow = style({
  display: 'flex',
  flexDirection: 'row',
  alignItems: 'stretch',
});
