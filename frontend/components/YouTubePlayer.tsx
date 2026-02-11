"use client";

import { useEffect, useRef } from "react";
import { usePlayer } from "@/contexts/PlayerContext";

/**
 * Hidden YouTube iframe player. Renders offscreen, controlled by PlayerContext.
 * Must be mounted once (e.g. in layout) and stays alive across page navigations.
 */
export default function YouTubePlayer() {
  const {
    playerRef,
    current,
    currentIndex,
    isPlaying,
    handleTrackEnded,
    setIsPlaying,
    setIsBuffering,
  } = usePlayer();
  const containerRef = useRef<HTMLDivElement>(null);
  const apiReady = useRef(false);

  // Keep latest callbacks in refs so the YT player closure never goes stale
  const handleTrackEndedRef = useRef(handleTrackEnded);
  const setIsPlayingRef = useRef(setIsPlaying);
  const setIsBufferingRef = useRef(setIsBuffering);
  useEffect(() => {
    handleTrackEndedRef.current = handleTrackEnded;
  }, [handleTrackEnded]);
  useEffect(() => {
    setIsPlayingRef.current = setIsPlaying;
  }, [setIsPlaying]);
  useEffect(() => {
    setIsBufferingRef.current = setIsBuffering;
  }, [setIsBuffering]);

  // Load YouTube IFrame API script once
  useEffect(() => {
    if (window.YT) {
      apiReady.current = true;
      return;
    }
    const tag = document.createElement("script");
    tag.src = "https://www.youtube.com/iframe_api";
    document.head.appendChild(tag);

    window.onYouTubeIframeAPIReady = () => {
      apiReady.current = true;
      initPlayer();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function initPlayer() {
    if (playerRef.current) return;
    (playerRef as React.MutableRefObject<YT.Player | null>).current =
      new window.YT.Player("yt-player-iframe", {
        height: "1",
        width: "1",
        playerVars: {
          autoplay: 0,
          controls: 0,
          disablekb: 1,
          fs: 0,
          modestbranding: 1,
          rel: 0,
        },
        events: {
          onStateChange: (event) => {
            const state = event.data;
            if (state === window.YT.PlayerState.PLAYING) {
              setIsPlayingRef.current(true);
              setIsBufferingRef.current(false);
            } else if (state === window.YT.PlayerState.PAUSED) {
              setIsPlayingRef.current(false);
              setIsBufferingRef.current(false);
            } else if (state === window.YT.PlayerState.BUFFERING) {
              setIsBufferingRef.current(true);
            } else if (state === window.YT.PlayerState.ENDED) {
              setIsPlayingRef.current(false);
              setIsBufferingRef.current(false);
              handleTrackEndedRef.current();
            }
          },
        },
      });
  }

  // Init player once API is loaded (for cases where YT was already available)
  useEffect(() => {
    if (apiReady.current && !playerRef.current) {
      initPlayer();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Track the currently loaded video ID + index to detect real changes
  const lastLoadedId = useRef<string | null>(null);
  const lastLoadedIndex = useRef<number>(-1);

  // Load and play when current track changes
  useEffect(() => {
    if (!current || !playerRef.current || !isPlaying) return;

    // Load if it's a new video OR the index changed (handles same videoId at different positions)
    if (
      lastLoadedId.current !== current.videoId ||
      lastLoadedIndex.current !== currentIndex
    ) {
      playerRef.current.loadVideoById(current.videoId);
      lastLoadedId.current = current.videoId;
      lastLoadedIndex.current = currentIndex;
    } else {
      // Same track, ensure it plays if paused
      if (
        playerRef.current.getPlayerState() !== window.YT.PlayerState.PLAYING
      ) {
        playerRef.current.playVideo();
      }
    }
  }, [current, currentIndex, isPlaying, playerRef]);

  return (
    <div
      ref={containerRef}
      className="fixed -left-[9999px] -top-[9999px] w-px h-px overflow-hidden"
      aria-hidden
    >
      <div id="yt-player-iframe" />
    </div>
  );
}
