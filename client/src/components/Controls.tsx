import { useState } from "react";
import { extractVideoId } from "./VideoPlayer";

interface Props {
  canControl: boolean;
  playState: "playing" | "paused";
  currentTime: number;
  onPlay: () => void;
  onPause: () => void;
  onSeek: (time: number) => void;
  onChangeVideo: (videoId: string) => void;
  onRequest: (action: string, details?: Record<string, unknown>) => void;
}

export default function Controls({ canControl, playState, currentTime, onPlay, onPause, onSeek, onChangeVideo, onRequest }: Props) {
  const [url, setUrl] = useState("");
  const [seekValue, setSeekValue] = useState(currentTime);
  const submitVideo = (e: React.FormEvent) => {
    e.preventDefault();
    const id = extractVideoId(url);
    if (!id) { alert("Enter a valid YouTube URL or 11-character video ID."); return; }
    if (canControl) onChangeVideo(id); else onRequest("change_video", { videoId: id });
    setUrl("");
  };

  return <section className="controls-panel">
    <div className="playback-row">
      <button disabled={!canControl} onClick={() => canControl ? (playState === "playing" ? onPause() : onPlay()) : onRequest(playState === "playing" ? "pause" : "play")}>
        {playState === "playing" ? "Ⅱ Pause" : "▶ Play"}
      </button>
      <div className="seek-control"><label htmlFor="seek">Seek</label><input id="seek" type="range" min="0" max="3600" step="1" value={Math.min(3600, seekValue)}
        onChange={e => setSeekValue(Number(e.target.value))} onMouseUp={() => canControl ? onSeek(seekValue) : onRequest("seek", { time: seekValue })}
        onTouchEnd={() => canControl ? onSeek(seekValue) : onRequest("seek", { time: seekValue })} disabled={!canControl} /><span>{Math.floor(seekValue / 60)}:{String(Math.floor(seekValue % 60)).padStart(2, "0")}</span></div>
    </div>
    <form className="video-form" onSubmit={submitVideo}><input value={url} onChange={e => setUrl(e.target.value)} placeholder="Paste a YouTube URL or video ID" aria-label="YouTube URL" />
      <button type="submit">{canControl ? "Change video" : "Request video"}</button></form>
    {!canControl && <p className="hint">You're in watch-only mode. Request playback changes for the host or a moderator to approve.</p>}
  </section>;
}
