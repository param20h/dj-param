import { forwardRef } from 'react';

/** Mount point for the YouTube IFrame: rendered but invisible (never display:none, per PRD §6). */
export const HiddenYouTube = forwardRef<HTMLDivElement>(function HiddenYouTube(_, ref) {
  return <div ref={ref} className="yt-hidden" aria-hidden="true" />;
});
