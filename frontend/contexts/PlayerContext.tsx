"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  useEffect,
} from "react";

export interface QueueTrack {
  videoId: string;
  title: string;
  artist?: string;
  album?: string;
  cover_url?: string;
  duration?: number; // in seconds
  recordId?: string; // vinyl record ID for backfilling duration
}

interface PlayerState {
  queue: QueueTrack[];
  currentIndex: number;
  isPlaying: boolean;
  current: QueueTrack | null;
  progress: number;
  duration: number;
  isBuffering: boolean;
}

interface PlayerContextValue extends PlayerState {
  addToQueue: (track: QueueTrack) => void;
  addMultipleToQueue: (tracks: QueueTrack[]) => void;
  play: (index?: number) => void;
  pause: () => void;
  toggle: () => void;
  next: () => void;
  prev: () => void;
  removeFromQueue: (index: number) => void;
  clearQueue: () => void;
  seek: (time: number) => void;
  handleTrackEnded: () => void;
  setIsPlaying: (v: boolean) => void;
  setIsBuffering: (v: boolean) => void;
  setProgress: (v: number) => void;
  setDuration: (v: number) => void;
  playerRef: React.RefObject<YT.Player | null>;
}

// YouTube IFrame API type (minimal)
declare global {
  interface Window {
    YT: typeof YT;
    onYouTubeIframeAPIReady: () => void;
  }
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace YT {
    class Player {
      constructor(elementId: string, options: PlayerOptions);
      playVideo(): void;
      pauseVideo(): void;
      loadVideoById(videoId: string): void;
      seekTo(seconds: number, allowSeekAhead: boolean): void;
      destroy(): void;
      getPlayerState(): number;
      getCurrentTime(): number;
      getDuration(): number;
    }
    interface PlayerOptions {
      height?: string;
      width?: string;
      videoId?: string;
      playerVars?: Record<string, unknown>;
      events?: {
        onReady?: (event: { target: Player }) => void;
        onStateChange?: (event: { data: number; target: Player }) => void;
      };
    }
    enum PlayerState {
      ENDED = 0,
      PLAYING = 1,
      PAUSED = 2,
      BUFFERING = 3,
      CUED = 5,
    }
  }
}

const PlayerContext = createContext<PlayerContextValue | null>(null);

export function usePlayer() {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error("usePlayer must be used within PlayerProvider");
  return ctx;
}

const STORAGE_KEY = "sedi-player";

function loadPersistedState(): { queue: QueueTrack[]; currentIndex: number } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        queue: parsed.queue || [],
        currentIndex: parsed.currentIndex ?? -1,
      };
    }
  } catch {
    /* ignore */
  }
  return { queue: [], currentIndex: -1 };
}

export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const [queue, setQueue] = useState<QueueTrack[]>(
    () => loadPersistedState().queue,
  );
  const [currentIndex, setCurrentIndex] = useState(
    () => loadPersistedState().currentIndex,
  );
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isBuffering, setIsBuffering] = useState(false);
  const playerRef = useRef<YT.Player | null>(null);

  // Persist queue + currentIndex to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ queue, currentIndex }),
      );
    } catch {
      /* ignore */
    }
  }, [queue, currentIndex]);

  const current =
    currentIndex >= 0 && currentIndex < queue.length
      ? queue[currentIndex]
      : null;

  const addToQueue = useCallback((track: QueueTrack) => {
    setQueue((q) => [...q, track]);
  }, []);

  const addMultipleToQueue = useCallback((tracks: QueueTrack[]) => {
    setQueue((q) => [...q, ...tracks]);
  }, []);

  const play = useCallback((index?: number) => {
    if (index !== undefined) {
      setCurrentIndex(index);
    }
    setIsPlaying(true);
  }, []);

  const pause = useCallback(() => {
    setIsPlaying(false);
    playerRef.current?.pauseVideo();
  }, []);

  const toggle = useCallback(() => {
    setIsPlaying((v) => {
      if (v) {
        playerRef.current?.pauseVideo();
      } else {
        playerRef.current?.playVideo();
      }
      return !v;
    });
  }, []);

  const next = useCallback(() => {
    setCurrentIndex((ci) => {
      const nextI = ci + 1;
      if (nextI >= queue.length) {
        // End of queue
        setIsPlaying(false);
        return ci;
      }
      return nextI;
    });
    setProgress(0);
    setDuration(0);
  }, [queue.length]);

  const prev = useCallback(() => {
    setCurrentIndex((i) => Math.max(0, i - 1));
  }, []);

  const removeFromQueue = useCallback((index: number) => {
    setQueue((q) => q.filter((_, i) => i !== index));
    setCurrentIndex((ci) => {
      if (index < ci) return ci - 1;
      if (index === ci) return ci; // will play next track at same index
      return ci;
    });
  }, []);

  const clearQueue = useCallback(() => {
    setQueue([]);
    setCurrentIndex(-1);
    setIsPlaying(false);
    playerRef.current?.pauseVideo();
  }, []);

  // Poll for progress + backfill track duration from YouTube player
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      if (
        playerRef.current &&
        typeof playerRef.current.getCurrentTime === "function"
      ) {
        setProgress(playerRef.current.getCurrentTime());
        const ytDuration = playerRef.current.getDuration();
        setDuration(ytDuration);

        // Backfill duration on QueueTrack if missing
        if (ytDuration > 0) {
          setQueue((q) => {
            const track = q[currentIndex];
            if (track && (!track.duration || track.duration === 0)) {
              const updated = [...q];
              updated[currentIndex] = {
                ...track,
                duration: Math.round(ytDuration),
              };
              return updated;
            }
            return q;
          });
        }
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [isPlaying, currentIndex]);

  // When a track finishes naturally: advance to next track
  const handleTrackEnded = useCallback(() => {
    const nextI = currentIndex + 1;
    if (nextI < queue.length) {
      setCurrentIndex(nextI);
      setIsPlaying(true);
    } else {
      // End of queue
      setIsPlaying(false);
    }
    setProgress(0);
    setDuration(0);
  }, [queue.length, currentIndex]);

  const seek = useCallback((time: number) => {
    if (playerRef.current) {
      playerRef.current.seekTo(time, true);
      setProgress(time);
    }
  }, []);

  return (
    <PlayerContext.Provider
      value={{
        queue,
        currentIndex,
        isPlaying,
        current,
        progress,
        duration,
        isBuffering,
        addToQueue,
        addMultipleToQueue,
        play,
        pause,
        toggle,
        next,
        prev,
        removeFromQueue,
        clearQueue,
        seek,
        handleTrackEnded,
        setIsPlaying,
        setIsBuffering,
        setProgress,
        setDuration,
        playerRef,
      }}
    >
      {children}
    </PlayerContext.Provider>
  );
}
