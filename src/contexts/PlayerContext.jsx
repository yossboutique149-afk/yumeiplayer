import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";

const PlayerContext = createContext(null);

export function PlayerProvider({ children }) {
  const audioRef = useRef(null);
  const [queue, setQueue] = useState([]);
  const [current, setCurrent] = useState(null);
  const [playing, setPlaying] = useState(false);
  const [timeMs, setTimeMs] = useState(0);
  const [durationMs, setDurationMs] = useState(0);
  const [error, setError] = useState("");

  useEffect(() => {
    if (typeof Audio === "undefined") return undefined;
    const audio = new Audio();
    audio.preload = "metadata";
    audioRef.current = audio;

    const onTime = () => setTimeMs(Math.round(audio.currentTime * 1000));
    const onMeta = () => setDurationMs(Math.round((audio.duration || 0) * 1000));
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onError = () =>
      setError("This audio source could not be played. Check the uploaded file or URL.");

    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("loadedmetadata", onMeta);
    audio.addEventListener("durationchange", onMeta);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("error", onError);

    return () => {
      audio.pause();
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("loadedmetadata", onMeta);
      audio.removeEventListener("durationchange", onMeta);
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("error", onError);
      audioRef.current = null;
    };
  }, []);

  const play = useCallback((song, list) => {
    const audio = audioRef.current;
    if (!song) return false;
    if (!song.audio_url) {
      setError("No audio has been uploaded for this song yet.");
      return false;
    }
    setError("");
    setQueue(Array.isArray(list) && list.length ? list : [song]);
    setCurrent(song);
    if (!audio) return false;
    if (audio.src !== new URL(song.audio_url, window.location.href).href) {
      audio.src = song.audio_url;
      setTimeMs(0);
    }
    audio.play().catch(() => {
      setPlaying(false);
      setError("Playback was blocked. Press play again to start the audio.");
    });
    return true;
  }, []);

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
    audio.currentTime = seconds;
    setTimeMs(Math.round(seconds * 1000));
  }, []);

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
      playing,
      timeMs,
      durationMs,
      error,
      play,
      toggle,
      seek,
      stop,
      next: () => step(1),
      previous: () => step(-1),
      clearError: () => setError("")
    }),
    [current, playing, timeMs, durationMs, error, play, toggle, seek, stop, step]
  );

  return <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>;
}

export function usePlayer() {
  const context = useContext(PlayerContext);
  if (!context) throw new Error("usePlayer must be used inside PlayerProvider");
  return context;
}
