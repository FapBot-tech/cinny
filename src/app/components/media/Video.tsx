import React, { VideoHTMLAttributes, forwardRef, useEffect } from 'react';
import classNames from 'classnames';
import * as css from './media.css';

export const Video = forwardRef<HTMLVideoElement, VideoHTMLAttributes<HTMLVideoElement>>(
  ({ className, style, src, controls, autoPlay, loop, muted, ...props }, ref) => {
    const [aspectRatio, setAspectRatio] = React.useState<string | number>('16/9');

    useEffect(() => {
      const handler = (msg: MessageEvent) => {
        if (msg.data === 'v-loaded') {
          (props as any).onLoadedMetadata?.();
        }
        if (msg.data === 'v-error') {
          (props as any).onError?.();
        }
        if (msg.data?.type === 'v-dimensions') {
          setAspectRatio(`${msg.data.width} / ${msg.data.height}`);
        }
      };
      window.addEventListener('message', handler);
      return () => window.removeEventListener('message', handler);
    }, [props]);

    const srcDoc = `<html><head><meta name='referrer' content='no-referrer'><style>html,body{margin:0;padding:0;width:100%;height:100%;overflow:hidden;}video{width:100%;height:100%;object-fit:contain;}</style></head><body><video ${controls ? 'controls' : ''} ${
      autoPlay ? 'autoplay' : ''
    } ${loop ? 'loop' : ''} ${
      muted ? 'muted' : ''
    } playsinline src='${src}'></video><script>const v=document.querySelector('video');v.onloadedmetadata=()=>{window.parent.postMessage('v-loaded','*');window.parent.postMessage({type:'v-dimensions',width:v.videoWidth,height:v.videoHeight},'*');};v.onerror=()=>window.parent.postMessage('v-error','*');</script></body></html>`;

    return (
      <iframe
        title={props.title}
        srcDoc={srcDoc}
        referrerPolicy="no-referrer"
        className={className}
        style={{
          border: 'none',
          aspectRatio,
          maxHeight: '40vh',
          ...style,
        }}
      />
    );
  }
);
