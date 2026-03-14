export type RecorderMode = "audio" | "video";

type RecorderFormat = {
  mimeType?: string;
  contentType: string;
  extension: string;
};

const FORMAT_CANDIDATES: Record<RecorderMode, RecorderFormat[]> = {
  audio: [
    { mimeType: "audio/webm;codecs=opus", contentType: "audio/webm", extension: "webm" },
    { mimeType: "audio/webm", contentType: "audio/webm", extension: "webm" },
    { mimeType: "audio/mp4;codecs=mp4a.40.2", contentType: "audio/mp4", extension: "m4a" },
    { mimeType: "audio/mp4", contentType: "audio/mp4", extension: "m4a" },
    { mimeType: "audio/ogg;codecs=opus", contentType: "audio/ogg", extension: "ogg" },
  ],
  video: [
    { mimeType: "video/webm;codecs=vp9,opus", contentType: "video/webm", extension: "webm" },
    { mimeType: "video/webm;codecs=vp8,opus", contentType: "video/webm", extension: "webm" },
    { mimeType: "video/webm", contentType: "video/webm", extension: "webm" },
    { mimeType: "video/mp4;codecs=h264,aac", contentType: "video/mp4", extension: "mp4" },
    { mimeType: "video/mp4", contentType: "video/mp4", extension: "mp4" },
  ],
};

function mimeSupported(mimeType?: string): boolean {
  if (!mimeType) return false;
  if (typeof MediaRecorder === "undefined" || typeof MediaRecorder.isTypeSupported !== "function") return false;
  return MediaRecorder.isTypeSupported(mimeType);
}

function mapContentTypeToExtension(contentType: string, mode: RecorderMode): string {
  const base = contentType.split(";")[0].toLowerCase();
  if (base.includes("webm")) return "webm";
  if (base.includes("ogg")) return "ogg";
  if (base.includes("quicktime")) return "mov";
  if (base.includes("mp4")) return mode === "audio" ? "m4a" : "mp4";
  if (base.includes("mpeg")) return mode === "audio" ? "mp3" : "mpg";
  return "webm";
}

function normalizeFormat(mode: RecorderMode, mimeType: string | undefined, fallback: RecorderFormat): RecorderFormat {
  const contentType = (mimeType || fallback.contentType).split(";")[0].toLowerCase();
  return {
    mimeType,
    contentType,
    extension: mapContentTypeToExtension(contentType, mode),
  };
}

export function buildMediaRecorder(stream: MediaStream, mode: RecorderMode) {
  if (typeof MediaRecorder === "undefined") {
    throw new Error("MediaRecorder is not supported on this device/browser.");
  }

  const fallback = FORMAT_CANDIDATES[mode][0];
  const preferred = FORMAT_CANDIDATES[mode].find((candidate) => mimeSupported(candidate.mimeType));

  const recorder = preferred?.mimeType
    ? new MediaRecorder(stream, { mimeType: preferred.mimeType })
    : new MediaRecorder(stream);

  const format = normalizeFormat(mode, recorder.mimeType || preferred?.mimeType, preferred || fallback);

  return { recorder, format };
}
