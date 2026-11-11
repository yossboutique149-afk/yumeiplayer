import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";
import { hasPlayableAudio } from "../lib/audioFile.js";

const PlayerContext = createContext(null);
const VOLUME_KEY = "yumeika:volume";

function readStoredVolume() {
  try {
    const stored = Number(window.localStorage.getItem(VOLUME_KEY));
    return Number.isFinite(stored) && stored >= 0 && stored <= 1 ? stored : 0.85;
  } catch {
    return 0.85;
  }
}

export function PlayerProvider({ children }) {
  const audioRef = useRef(null);
  const [queue, setQueue] = useState([]);
  const [current, setCurrent] = useState(null);
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [timeMs, setTimeMs] = useState(0);
  const [durationMs, setDurationMs] = useState(0);
  const [volume, setVolumeState] = useState(readStoredVolume);
  const [muted, setMuted] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (typeof Audio === "undefined") return undefined;
    const audio = new Audio();
    audio.preload = "metadata";
    audio.volume = readStoredVolume();
    audioRef.current = audio;

    const onTime = () => setTimeMs(Math.round(audio.currentTime * 1000));
    const onMeta = () => {
      setDurationMs(Math.round((audio.duration || 0) * 1000));
      setLoading(false);
    };
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onWaiting = () => setLoading(true);
    const onPlaying = () => {
      setLoading(false);
      setPlaying(true);
    };
    const onEnded = () => {
      setPlaying(false);
      setLoading(false);
    };
    const onError = () =>
      setError("This audio source could not be played. Check the uploaded file or URL.");

    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("loadedmetadata", onMeta);
    audio.addEventListener("durationchange", onMeta);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("waiting", onWaiting);
    audio.addEventListener("playing", onPlaying);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("error", onError);

    return () => {
      audio.pause();
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("loadedmetadata", onMeta);
      audio.removeEventListener("durationchange", onMeta);
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("waiting", onWaiting);
      audio.removeEventListener("playing", onPlaying);
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("error", onError);
      audioRef.current = null;
    };
  }, []);

  /** Starts a track inside YUMEIKA. Never opens Spotify. */
  const play = useCallback((song, list) => {
    if (!song) return false;
    if (!hasPlayableAudio(song)) {
      setError(
        "This song has no audio file yet. Upload it in the Studio, then press play."
      );
      return false;
    }

    const audio = audioRef.current;
    setError("");
    setQueue(Array.isArray(list) && list.length ? list : [song]);
    setCurrent(song);
    if (!audio) return false;

    const target = new URL(song.audio_url, window.location.href).href;
    if (audio.src !== target) {
      setLoading(true);
      audio.src = target;
      setTimeMs(0);
      setDurationMs(song.duration_seconds ? song.duration_seconds * 1000 : 0);
    }
    audio.play().catch(() => {
      setPlaying(false);
      setLoading(false);
      setError("Playback was blocked. Press play again to start the audio.");
    });
    return true;
  }, []);

  /** Plays a whole list (album, search results, favorites) from the top. */
  const playAll = useCallback(
    (list, startIndex = 0) => {
      const playable = (list || []).filter(hasPlayableAudio);
      if (!playable.length) {
        setError("None of these songs has an audio file yet.");
        return false;
      }
      const start = playable[Math.min(Math.max(startIndex, 0), playable.length - 1)];
      return play(start, playable);
    },
    [play]
  );

  const toggle = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !current) return;
    if (audio.paused) {
      audio.play().catch(() => setError("Playback could not start."));
    } else {
      audio.pause();
    }
  }, [current]);

  const seek = useCallback(ms => {
    const audio = audioRef.current;
    if (!audio) return;
    const seconds = Math.max(0, Number(ms) / 1000);
    try {
      audio.currentTime = seconds;
    } catch {
      /* metadata not ready yet */
    }
    setTimeMs(Math.round(seconds * 1000));
  }, []);

  const setVolume = useCallback(next => {
    const value = Math.min(1, Math.max(0, Number(next) || 0));
    setVolumeState(value);
    setMuted(value === 0);
    if (audioRef.current) {
      audioRef.current.volume = value;
      audioRef.current.muted = value === 0;
    }
    try {
      window.localStorage.setItem(VOLUME_KEY, String(value));
    } catch {
      /* private mode: keep it for this session only */
    }
  }, []);

  const toggleMute = useCallback(() => {
    const audio = audioRef.current;
    const next = !muted;
    setMuted(next);
    if (audio) audio.muted = next;
  }, [muted]);

  const stop = useCallback(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }
    setPlaying(false);
    setTimeMs(0);
  }, []);

  const step = useCallback(
    direction => {
      if (!current || queue.length === 0) return;
      const index = queue.findIndex(item => item.id === current.id);
      if (index < 0) return;
      const nextIndex = (index + direction + queue.length) % queue.length;
      play(queue[nextIndex], queue);
    },
    [current, queue, play]
  );

  const value = useMemo(
    () => ({
      current,
      queue,
      playing,
      loading,
      timeMs,
      durationMs,
      volume,
      muted,
      error,
      play,
      playAll,
      toggle,
      seek,
      setVolume,
      toggleMute,
      stop,
      next: () => step(1),
      previous: () => step(-1),
      clearError: () => setError("")
    }),
    [
      current,
      queue,
      playing,
      loading,
      timeMs,
      durationMs,
      volume,
      muted,
      error,
      play,
      playAll,
      toggle,
      seek,
      setVolume,
      toggleMute,
      stop,
      step
    ]
  );

  return <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>;
}

export function usePlayer() {
  const context = useContext(PlayerContext);
  if (!context) throw new Error("usePlayer must be used inside PlayerProvider");
  return context;
}
