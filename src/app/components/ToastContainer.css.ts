import { style } from '@vanilla-extract/css';
import { config } from 'folds';

export const ToastContainer = style({
  position: 'fixed',
  top: config.space.S400,
  right: config.space.S400,
  zIndex: 1000,
  width: '320px',
  pointerEvents: 'none',
});

export const ToastItem = style({
  pointerEvents: 'auto',
  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
  transition: 'transform 0.2s ease, opacity 0.2s ease',
  selectors: {
    '&:hover': {
      transform: 'translateY(-2px)',
    },
  },
});
