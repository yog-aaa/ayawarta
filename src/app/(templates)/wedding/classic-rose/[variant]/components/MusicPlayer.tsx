"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { ClassicRoseThemeConfig } from "@/lib/theme-config/classic-rose";

type YTPlayerInstance = {
  playVideo: () => void;
  mute: () => void;
  unMute: () => void;
  destroy: () => void;
  setVolume: (volume: number) => void;
};

type YTEvent = {
  target: YTPlayerInstance;
  data?: number;
};

declare global {
  interface Window {
    YT?: {
      Player: new (
        elementId: string,
        options: Record<string, unknown>
      ) => YTPlayerInstance;
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

type MusicPlayerProps = {
  videoUrl: string;
  theme?: ClassicRoseThemeConfig;
};

const VolumeOnIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
    <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
    <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
  </svg>
);

const VolumeOffIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
    <line x1="23" y1="9" x2="17" y2="15" />
    <line x1="17" y1="9" x2="23" y2="15" />
  </svg>
);

const getYoutubeVideoId = (url: string): string | null => {
  const regExp =
    /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);

  return match && match[2].length === 11 ? match[2] : null;
};

const isDirectAudioUrl = (url: string): boolean => /\.(mp3|wav|mpeg)(\?.*)?$/i.test(url);

const MusicPlayer = ({ videoUrl }: MusicPlayerProps) => {
  const [isPlaying, setIsPlaying] = useState(true);
  const playerRef = useRef<YTPlayerInstance | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const autoplayBlockedRef = useRef(false);
  const ytStartedRef = useRef(false);

  const videoId = getYoutubeVideoId(videoUrl);

  useEffect(() => {
    const isYouTube = Boolean(videoId);
    const isAudio = isDirectAudioUrl(videoUrl);
    const currentAudio = audioRef.current;

    if (playerRef.current) {
      playerRef.current.destroy();
      playerRef.current = null;
    }

    if (currentAudio) {
      currentAudio.pause();
      currentAudio.removeAttribute("src");
      currentAudio.load();
    }

    window.onYouTubeIframeAPIReady = undefined;
    autoplayBlockedRef.current = false;
    ytStartedRef.current = false;

    if (isYouTube && videoId) {
      const setupPlayer = () => {
        if (!window.YT?.Player) return;

        playerRef.current = new window.YT.Player("youtube-player", {
          height: "0",
          width: "0",
          videoId,
          playerVars: {
            autoplay: 1,
            loop: 1,
            playlist: videoId,
          },
          events: {
            onReady: (event: YTEvent) => {
              event.target.unMute();
              event.target.setVolume(50);
              event.target.playVideo();
            },
            onStateChange: (event: YTEvent) => {
              if (event.data === 1) {
                ytStartedRef.current = true;
              }
            },
          },
        });
      };

      if (!window.YT) {
        window.onYouTubeIframeAPIReady = setupPlayer;
        const tag = document.createElement("script");
        tag.src = "https://www.youtube.com/iframe_api";
        const firstScriptTag = document.getElementsByTagName("script")[0];
        firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
      } else {
        setupPlayer();
      }
    } else if (isAudio && currentAudio) {
      currentAudio.src = videoUrl;
      currentAudio.loop = true;
      currentAudio.volume = 0.5;
      currentAudio.muted = false;
      currentAudio.play().catch(() => {
        autoplayBlockedRef.current = true;
      });
    } else {
      console.error("Unsupported media URL provided:", videoUrl);
    }

    return () => {
      if (playerRef.current) {
        playerRef.current.destroy();
        playerRef.current = null;
      }

      if (currentAudio) {
        currentAudio.pause();
        currentAudio.removeAttribute("src");
        currentAudio.load();
      }

      window.onYouTubeIframeAPIReady = undefined;
      autoplayBlockedRef.current = false;
      ytStartedRef.current = false;
    };
  }, [videoId, videoUrl]);

  const toggleMusic = () => {
    const isYouTube = Boolean(videoId);
    const isAudio = isDirectAudioUrl(videoUrl);

    if (isAudio && audioRef.current) {
      const audio = audioRef.current;

      if (audio.paused || autoplayBlockedRef.current) {
        audio.muted = false;
        audio.play().catch(() => undefined);
        autoplayBlockedRef.current = false;
        setIsPlaying(true);
        return;
      }

      if (isPlaying) {
        audio.muted = true;
        setIsPlaying(false);
      } else {
        audio.muted = false;
        if (audio.paused) {
          audio.play().catch(() => undefined);
        }
        setIsPlaying(true);
      }

      return;
    }

    if (isYouTube && playerRef.current) {
      if (!ytStartedRef.current) {
        playerRef.current.unMute();
        playerRef.current.playVideo();
        ytStartedRef.current = true;
        setIsPlaying(true);
        return;
      }

      if (isPlaying) {
        playerRef.current.mute();
        setIsPlaying(false);
      } else {
        playerRef.current.unMute();
        playerRef.current.playVideo();
        setIsPlaying(true);
      }
    }
  };

  return (
    <>
      <div id="youtube-player" className="absolute -top-96" />
      <audio ref={audioRef} className="hidden" preload="none" />

      <motion.button
        onClick={toggleMusic}
        aria-label={isPlaying ? "Jeda musik" : "Putar musik"}
        className="classic-rose-primary-action fixed bottom-5 right-5 z-50 flex h-12 w-12 items-center justify-center rounded-full shadow-lg"
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={isPlaying ? "on" : "off"}
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.5, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {isPlaying ? <VolumeOnIcon className="h-6 w-6" /> : <VolumeOffIcon className="h-6 w-6" />}
          </motion.div>
        </AnimatePresence>
      </motion.button>
    </>
  );
};

export default MusicPlayer;
