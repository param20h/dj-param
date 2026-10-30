import { useCallback, useEffect, useRef, useState } from 'react';
import { ACCENTS, PLAYLIST_ID, type Accent } from '../data/playlist';
import { loadYouTubeApi } from '../lib/youtube';
import { shuffle } from '../lib/shuffle';

export type PlayerStatus =
  | 'loading'
  | 'ready'
  | 'playing'
  | 'paused'
  | 'buffering'
  | 'error';

export interface Track {
  id: string;
  title: string;
  author: string;
  thumb: string;
}

const MAX_CONSECUTIVE_ERRORS = 5;
const VOLUME_KEY = 'robot-dj:volume';

function readStoredVolume(): number {
  try {
    const v = Number(localStorage.getItem(VOLUME_KEY));
    return Number.isFinite(v) && v > 0 && v <= 100 ? v : 80;
  } catch {
    return 80;
  }
}

export function usePlayer(mountRef: React.RefObject<HTMLDivElement>) {
  const playerRef = useRef<YT.Player | null>(null);
  const queueRef = useRef<string[]>([]);
  const indexRef = useRef(0);
  const startedRef = useRef(false);
  const errorStreakRef = useRef(0);

  const [status, setStatus] = useState<PlayerStatus>('loading');
  const [queueLength, setQueueLength] = useState(0);
  const [index, setIndex] = useState(0);
  const [track, setTrack] = useState<Track | null>(null);
  const [volume, setVolumeState] = useState(readStoredVolume);
  const [muted, setMuted] = useState(false);
  const [pinnedAccent, setPinnedAccent] = useState<Accent | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [trackChangedAt, setTrackChangedAt] = useState(0);
  const [started, setStarted] = useState(false);

  const playAt = useCallback((i: number) => {
    const player = playerRef.current;
    const id = queueRef.current[i];
    if (!player || !id) return;
    indexRef.current = i;
    setIndex(i);
    setTrack({ id, title: 'Loading track…', author: '', thumb: `https://i.ytimg.com/vi/${id}/mqdefault.jpg` });
    setTrackChangedAt(performance.now());
    player.loadVideoById(id);
  }, []);

  const next = useCallback(() => {
    const queue = queueRef.current;
    if (!queue.length) return;
    let i = indexRef.current + 1;
    if (i >= queue.length) {
      // Queue exhausted: reshuffle, never replaying the track that just ended first.
      queueRef.current = shuffle(queue, queue[indexRef.current]);
      i = 0;
    }
    playAt(i);
  }, [playAt]);

  useEffect(() => {
    let cancelled = false;
    let pollTimer: number | undefined;

    loadYouTubeApi().then((YTApi) => {
      if (cancelled || !mountRef.current) return;
      const target = document.createElement('div');
      mountRef.current.appendChild(target);

      const tryReadPlaylist = (attempt = 0) => {
        const ids = playerRef.current?.getPlaylist();
        if (ids?.length) {
          queueRef.current = shuffle(ids);
          setQueueLength(ids.length);
          setStatus('ready');
          return;
        }
        if (attempt > 40) {
          setStatus('error');
          setError('Could not load the playlist. Check that PLAYLIST_ID is public and embeddable.');
          return;
        }
        pollTimer = window.setTimeout(() => tryReadPlaylist(attempt + 1), 250);
      };

      playerRef.current = new YTApi.Player(target, {
        width: 0,
        height: 0,
        playerVars: { controls: 0, playsinline: 1, disablekb: 1, rel: 0, fs: 0, iv_load_policy: 3 },
        events: {
          onReady: (e) => {
            e.target.setVolume(readStoredVolume());
            e.target.cuePlaylist({ listType: 'playlist', list: PLAYLIST_ID });
            tryReadPlaylist();
          },
          onStateChange: (e) => {
            const S = YTApi.PlayerState;
            switch (e.data) {
              case S.PLAYING: {
                errorStreakRef.current = 0;
                setError(null);
                setStatus('playing');
                const data = (e.target as unknown as { getVideoData(): { video_id: string; title: string; author: string } }).getVideoData();
                if (data?.title) {
                  setTrack({
                    id: data.video_id,
                    title: data.title,
                    author: data.author,
                    thumb: `https://i.ytimg.com/vi/${data.video_id}/mqdefault.jpg`,
                  });
                }
                break;
              }
              case S.PAUSED:
                setStatus('paused');
                break;
              case S.BUFFERING:
                if (startedRef.current) setStatus('buffering');
                break;
              case S.ENDED:
                if (startedRef.current) next();
                break;
            }
          },
          onError: () => {
            if (!startedRef.current) return;
            errorStreakRef.current += 1;
            if (errorStreakRef.current >= MAX_CONSECUTIVE_ERRORS) {
              setStatus('error');
              setError('Several tracks in a row refused to play. They may block embedding.');
              return;
            }
            next();
          },
        },
      });
    });

    return () => {
      cancelled = true;
      window.clearTimeout(pollTimer);
      playerRef.current?.destroy();
      playerRef.current = null;
    };
  }, [mountRef, next]);

  // Media Session: lock-screen / hardware key controls.
  useEffect(() => {
    if (!('mediaSession' in navigator) || !track) return;
    navigator.mediaSession.metadata = new MediaMetadata({
      title: track.title,
      artist: track.author,
      album: 'Robot DJ · GDG Jalandhar',
      artwork: [{ src: track.thumb, sizes: '320x180', type: 'image/jpeg' }],
    });
  }, [track]);

  const start = useCallback(() => {
    if (startedRef.current || !queueRef.current.length) return;
    startedRef.current = true;
    setStarted(true);
    playAt(0);
  }, [playAt]);

  const toggle = useCallback(() => {
    const player = playerRef.current;
    if (!player) return;
    if (!startedRef.current) return start();
    if (player.getPlayerState() === YT.PlayerState.PLAYING) player.pauseVideo();
    else player.playVideo();
  }, [start]);

  useEffect(() => {
    if (!('mediaSession' in navigator)) return;
    navigator.mediaSession.setActionHandler('play', toggle);
    navigator.mediaSession.setActionHandler('pause', toggle);
    navigator.mediaSession.setActionHandler('nexttrack', next);
  }, [toggle, next]);

  const setVolume = useCallback((v: number) => {
    setVolumeState(v);
    const player = playerRef.current;
    player?.setVolume(v);
    if (v > 0 && player?.isMuted()) {
      player.unMute();
      setMuted(false);
    }
    try {
      localStorage.setItem(VOLUME_KEY, String(v));
    } catch {
      /* storage unavailable */
    }
  }, []);

  const toggleMute = useCallback(() => {
    const player = playerRef.current;
    if (!player) return;
    if (player.isMuted()) player.unMute();
    else player.mute();
    setMuted((m) => !m);
  }, []);

  const getCurrentTime = useCallback(() => playerRef.current?.getCurrentTime?.() ?? 0, []);
  const getDuration = useCallback(() => playerRef.current?.getDuration?.() ?? 0, []);

  const accent: Accent = pinnedAccent ?? ACCENTS[index % ACCENTS.length];

  return {
    status,
    started,
    track,
    index,
    queueLength,
    volume,
    muted,
    accent,
    pinnedAccent,
    error,
    trackChangedAt,
    start,
    toggle,
    next,
    setVolume,
    toggleMute,
    setPinnedAccent,
    getCurrentTime,
    getDuration,
  };
}

export type PlayerApi = ReturnType<typeof usePlayer>;
