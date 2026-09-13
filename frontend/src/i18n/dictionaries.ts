export const de = {
  nav_library: "Bibliothek",
  nav_channels: "Kanäle",
  nav_downloads: "Downloads",
  nav_settings: "Einstellungen",

  video_url_placeholder: "Video-URL einfügen…",
  video_url_download: "Herunterladen",

  library_search_placeholder: "Videos durchsuchen…",
  library_filter_all_channels: "Alle Kanäle",
  library_filter_all_status: "Alle Status",
  library_sort_date: "Datum",
  library_sort_name: "Name",
  library_sort_channel: "Kanal",
  library_empty: "Keine Videos gefunden.",
  library_download_selected: "Ausgewählte herunterladen",
  library_delete: "Löschen",

  status_pending: "Ausstehend",
  status_downloading: "Lädt herunter",
  status_completed: "Fertig",
  status_error: "Fehler",

  channels_add_placeholder: "Kanal-URL einfügen…",
  channels_add_button: "Kanal hinzufügen",
  channels_fetch_button: "Neue Videos laden",
  channels_fetch_found: "{count} neue(s) Video(s) gefunden",
  channels_fetch_none: "Keine neuen Videos gefunden",
  channels_audio_only: "Nur Audio",
  channels_delete: "Entfernen",
  channels_empty: "Noch keine Kanäle hinzugefügt.",

  downloads_empty: "Keine aktiven Downloads.",
  downloads_cancel: "Abbrechen",

  settings_language: "Sprache",
  settings_dark_mode: "Dunkelmodus",
  settings_max_parallel: "Maximale parallele Downloads",
  settings_sponsorblock: "SponsorBlock (Werbesegmente entfernen)",
  settings_yt_dlp_version: "yt-dlp Version",
  settings_check_update: "Nach Updates suchen",
  settings_update: "yt-dlp aktualisieren",
  settings_backup: "Datenbank sichern",

  common_save: "Speichern",
  common_loading: "Lädt…",
};

export const en: typeof de = {
  nav_library: "Library",
  nav_channels: "Channels",
  nav_downloads: "Downloads",
  nav_settings: "Settings",

  video_url_placeholder: "Paste video URL…",
  video_url_download: "Download",

  library_search_placeholder: "Search videos…",
  library_filter_all_channels: "All channels",
  library_filter_all_status: "All statuses",
  library_sort_date: "Date",
  library_sort_name: "Name",
  library_sort_channel: "Channel",
  library_empty: "No videos found.",
  library_download_selected: "Download selected",
  library_delete: "Delete",

  status_pending: "Pending",
  status_downloading: "Downloading",
  status_completed: "Completed",
  status_error: "Error",

  channels_add_placeholder: "Paste channel URL…",
  channels_add_button: "Add channel",
  channels_fetch_button: "Fetch new videos",
  channels_fetch_found: "Found {count} new video(s)",
  channels_fetch_none: "No new videos found",
  channels_audio_only: "Audio only",
  channels_delete: "Remove",
  channels_empty: "No channels added yet.",

  downloads_empty: "No active downloads.",
  downloads_cancel: "Cancel",

  settings_language: "Language",
  settings_dark_mode: "Dark mode",
  settings_max_parallel: "Max parallel downloads",
  settings_sponsorblock: "SponsorBlock (remove sponsor segments)",
  settings_yt_dlp_version: "yt-dlp version",
  settings_check_update: "Check for updates",
  settings_update: "Update yt-dlp",
  settings_backup: "Backup database",

  common_save: "Save",
  common_loading: "Loading…",
};

export type TranslationKey = keyof typeof de;
export const dictionaries = { de, en };
