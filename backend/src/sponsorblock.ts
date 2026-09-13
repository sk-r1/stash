/**
 * yt-dlp has native SponsorBlock support: it queries the SponsorBlock API and cuts
 * segments via ffmpeg internally, so this module is pure CLI-flag mapping.
 */
export function sponsorBlockArgs(enabled: boolean): string[] {
  return enabled ? ["--sponsorblock-remove", "all"] : [];
}
