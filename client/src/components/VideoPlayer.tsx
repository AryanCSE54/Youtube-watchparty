import YouTube, { type YouTubeEvent } from "react-youtube";
import { useEffect, useRef } from "react";

interface Props {
  videoId: string;
  playState: "playing" | "paused";
  currentTime: number;
  syncVersion: number;
  canControl: boolean;
  onLocalState: (
    action: "play" | "pause" | "seek",
    time: number
  ) => void;
  onReady: (player: YT.Player) => void;
}

export function extractVideoId(value: string): string | null {
  const input = value.trim();

  if (/^[a-zA-Z0-9_-]{11}$/.test(input)) return input;

  try {
    const url = new URL(input);

    if (url.hostname === "youtu.be" || url.hostname.endsWith(".youtu.be")) {
      const id = url.pathname.split("/").filter(Boolean)[0];
      return id && /^[\w-]{11}$/.test(id) ? id : null;
    }

    if (
      url.hostname === "youtube.com" ||
      url.hostname.endsWith(".youtube.com")
    ) {
      let id: string | null = null;

      if (url.pathname === "/watch") {
        id = url.searchParams.get("v");
      } else {
        const parts = url.pathname.split("/").filter(Boolean);

        if (["embed", "shorts", "live"].includes(parts[0])) {
          id = parts[1] ?? null;
        }
      }

      return id && /^[\w-]{11}$/.test(id) ? id : null;
    }
  } catch {
    // The input isn't a URL.
  }

  return null;
}

export default function VideoPlayer({
  videoId,
  playState,
  currentTime,
  syncVersion,
  canControl,
  onLocalState,
  onReady,
}: Props) {
  const playerRef = useRef<YT.Player | null>(null);
  const applyingRemote = useRef(false);
  const lastSyncVersion = useRef(-1);
  const lastEventTime = useRef(0);
  const timerRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    return () => {
      if (timerRef.current !== undefined) {
        window.clearTimeout(timerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const player = playerRef.current;

    if (!player || lastSyncVersion.current === syncVersion) return;

    lastSyncVersion.current = syncVersion;
    applyingRemote.current = true;

    try {
      const time = player.getCurrentTime();

      if (Math.abs(time - currentTime) > 2.5) {
        player.seekTo(currentTime, true);
      }

      if (playState === "playing") {
        player.playVideo();
      } else {
        player.pauseVideo();
      }
    } catch (error) {
      console.error("Could not synchronize video:", error);
    }

    if (timerRef.current !== undefined) {
      window.clearTimeout(timerRef.current);
    }

    timerRef.current = window.setTimeout(() => {
      applyingRemote.current = false;
    }, 800);
  }, [syncVersion, currentTime, playState, videoId]);

  const ready = (event: YouTubeEvent) => {
    playerRef.current = event.target;

    try {
      onReady(event.target);
      event.target.seekTo(currentTime, true);

      if (playState === "playing") {
        event.target.playVideo();
      }
    } catch (error) {
      console.error("YouTube player initialization failed:", error);
    }

    applyingRemote.current = true;

    if (timerRef.current !== undefined) {
      window.clearTimeout(timerRef.current);
    }

    timerRef.current = window.setTimeout(() => {
      applyingRemote.current = false;
    }, 1000);
  };

  const stateChange = (event: YouTubeEvent) => {
    if (applyingRemote.current || !canControl) return;

    const now = Date.now();

    if (now - lastEventTime.current < 500) return;

    const time = event.target.getCurrentTime() || 0;

    if (event.data === 1) {
      lastEventTime.current = now;
      onLocalState("play", time);
    } else if (event.data === 2) {
      lastEventTime.current = now;
      onLocalState("pause", time);
    }
  };

  return (
    <div className="video-frame">
      <YouTube
        key={videoId}
        videoId={videoId}
        onReady={ready}
        onStateChange={stateChange}
        onError={(event) =>
          console.error("YouTube player error:", event.data)
        }
        opts={{
          width: "100%",
          height: "100%",
          playerVars: {
            autoplay: 0,
            controls: 1,
            rel: 0,
            playsinline: 1,
          },
        }}
        className="youtube-iframe"
        iframeClassName="youtube-iframe"
      />
    </div>
  );
}
