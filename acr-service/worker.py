"""
Cube ACR → Google Drive → Whisper → CRM (cloud worker)

Runs 24/7 on Azure App Service. Polls Drive "Cube ACR" folder for new .amr
recordings, transcribes with OpenAI Whisper (language=en), POSTs to CRM /api/calls.

Requires env: OPENAI_API_KEY, CRM_API_KEY, CRM_API_URL,
GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN.
"""

from __future__ import annotations

import io
import json
import os
import re
import subprocess
import tempfile
import threading
import time
import traceback
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any
from urllib.parse import urljoin

import imageio_ffmpeg
import requests
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from googleapiclient.http import MediaIoBaseDownload
from openai import OpenAI

GOOGLE_SCOPES = ["https://www.googleapis.com/auth/drive.readonly"]

# ---- runtime status (for /health) ----
_status: dict[str, Any] = {
    "service": "mkus-acr-worker",
    "ok": True,
    "started_at": None,
    "last_poll_at": None,
    "last_success_at": None,
    "last_error": None,
    "processed_count": 0,
    "folder_id": None,
    "drive_ok": False,
}


def env(name: str, default: str | None = None) -> str:
    value = os.environ.get(name, default)
    if value is None or value == "":
        raise RuntimeError(f"Missing required env: {name}")
    return value


def env_optional(name: str, default: str = "") -> str:
    return os.environ.get(name, default) or default


def config() -> dict[str, Any]:
    return {
        "crm_api_url": env_optional("CRM_API_URL", "https://mkus-crm-fed7cd.azurewebsites.net").rstrip(
            "/"
        ),
        "crm_api_key": env("CRM_API_KEY"),
        "openai_api_key": env("OPENAI_API_KEY"),
        "whisper_language": env_optional("WHISPER_LANGUAGE", "en"),
        "whisper_model": env_optional("WHISPER_MODEL", "whisper-1"),
        "google_client_id": env("GOOGLE_CLIENT_ID"),
        "google_client_secret": env("GOOGLE_CLIENT_SECRET"),
        "google_refresh_token": env("GOOGLE_REFRESH_TOKEN"),
        "drive_folder_name": env_optional("DRIVE_FOLDER_NAME", "Cube ACR"),
        "check_interval": int(env_optional("CHECK_INTERVAL_SECONDS", "300")),
        "processed_log": env_optional("PROCESSED_LOG_FILE", "/home/processed.json"),
        "temp_dir": env_optional("TEMP_DIR", tempfile.gettempdir()),
        "port": int(env_optional("PORT", "8080")),
        "host": env_optional("HOST", "0.0.0.0"),
    }


def get_drive_service(cfg: dict[str, Any]):
    """Non-interactive Drive auth via stored OAuth refresh token."""
    creds = Credentials(
        token=None,
        refresh_token=cfg["google_refresh_token"],
        token_uri="https://oauth2.googleapis.com/token",
        client_id=cfg["google_client_id"],
        client_secret=cfg["google_client_secret"],
        scopes=GOOGLE_SCOPES,
    )
    creds.refresh(Request())
    return build("drive", "v3", credentials=creds, cache_discovery=False)


def find_folder_id(service, folder_name: str) -> str:
    query = (
        f"name='{folder_name}' and mimeType='application/vnd.google-apps.folder' and trashed=false"
    )
    results = service.files().list(q=query, fields="files(id, name)", pageSize=10).execute()
    folders = results.get("files", [])
    if not folders:
        raise RuntimeError(f"Drive folder not found: {folder_name}")
    return folders[0]["id"]


def list_new_files(service, folder_id: str, processed_ids: set[str]):
    query = f"'{folder_id}' in parents and trashed=false"
    results = (
        service.files()
        .list(q=query, fields="files(id, name, mimeType, modifiedTime)", pageSize=1000)
        .execute()
    )
    files = results.get("files", [])
    amr_files = [
        f
        for f in files
        if f["name"].lower().endswith(".amr") and f["id"] not in processed_ids
    ]
    json_files = {f["name"]: f for f in files if f["name"].lower().endswith(".json")}
    return amr_files, json_files


def download_file(service, file_id: str, destination: str) -> None:
    request = service.files().get_media(fileId=file_id)
    with io.FileIO(destination, "wb") as fh:
        downloader = MediaIoBaseDownload(fh, request)
        done = False
        while not done:
            _, done = downloader.next_chunk()


def convert_amr_to_mp3(amr_path: str) -> str:
    """Whisper does not accept .amr — convert via bundled ffmpeg binary."""
    mp3_path = re.sub(r"\.amr$", ".mp3", amr_path, flags=re.IGNORECASE)
    if mp3_path == amr_path:
        mp3_path = amr_path + ".mp3"
    ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()
    result = subprocess.run(
        [ffmpeg, "-y", "-i", amr_path, "-acodec", "libmp3lame", "-ar", "16000", "-ac", "1", mp3_path],
        capture_output=True,
        text=True,
    )
    if result.returncode != 0:
        raise RuntimeError(f"ffmpeg failed: {result.stderr[-500:]}")
    return mp3_path


def transcribe_audio(cfg: dict[str, Any], file_path: str) -> str:
    mp3_path = convert_amr_to_mp3(file_path)
    try:
        client = OpenAI(api_key=cfg["openai_api_key"])
        with open(mp3_path, "rb") as audio_file:
            transcript = client.audio.transcriptions.create(
                model=cfg["whisper_model"],
                file=audio_file,
                language=cfg["whisper_language"],
            )
        return (transcript.text or "").strip()
    finally:
        try:
            os.remove(mp3_path)
        except OSError:
            pass


def load_processed(path: str) -> set[str]:
    p = Path(path)
    if not p.exists():
        return set()
    try:
        data = json.loads(p.read_text(encoding="utf-8"))
        if isinstance(data, list):
            return set(str(x) for x in data)
        if isinstance(data, dict) and "ids" in data:
            return set(str(x) for x in data["ids"])
    except (json.JSONDecodeError, OSError) as e:
        print(f"WARN: could not read processed log: {e}")
    return set()


def save_processed(path: str, processed_ids: set[str]) -> None:
    p = Path(path)
    p.parent.mkdir(parents=True, exist_ok=True)
    tmp = p.with_suffix(p.suffix + ".tmp")
    tmp.write_text(json.dumps(sorted(processed_ids), indent=0), encoding="utf-8")
    tmp.replace(p)


def _first_str(meta: dict[str, Any], *keys: str) -> str | None:
    for key in keys:
        if key in meta and meta[key] is not None:
            val = str(meta[key]).strip()
            if val:
                return val
    return None


def extract_phone(meta: dict[str, Any], file_name: str) -> str:
    phone = _first_str(
        meta,
        "phone_number",
        "phone",
        "number",
        "phoneNumber",
        "tel",
        "caller",
        "contact_number",
    )
    if phone:
        return phone

    # Cube ACR filenames often contain the number
    m = re.search(r"(\+?\d[\d\s\-()]{7,}\d)", file_name)
    if m:
        return re.sub(r"[\s\-()]", "", m.group(1))

    raise RuntimeError(f"No phone found in meta/filename for {file_name}")


def extract_call_date(meta: dict[str, Any]) -> str:
    raw = _first_str(
        meta,
        "call_date",
        "date",
        "datetime",
        "timestamp",
        "time",
        "created",
        "callDate",
    )
    if raw:
        # epoch seconds / ms
        if re.fullmatch(r"\d{10,13}", raw):
            ts = int(raw)
            if ts > 10_000_000_000:
                ts //= 1000
            return datetime.fromtimestamp(ts, tz=timezone.utc).isoformat()
        try:
            # Let CRM validate ISO; normalize common formats
            dt = datetime.fromisoformat(raw.replace("Z", "+00:00"))
            return dt.isoformat()
        except ValueError:
            # Pass through — CRM returns 400 if invalid
            return raw
    return datetime.now(timezone.utc).isoformat()


def extract_duration_seconds(meta: dict[str, Any]) -> int | None:
    for key in ("duration_seconds", "duration", "durationSec", "length"):
        if key not in meta or meta[key] is None:
            continue
        try:
            val = float(str(meta[key]).strip().replace(",", "."))
            # durations in ms sometimes
            if val > 10_000:
                val /= 1000
            return max(0, int(val))
        except ValueError:
            continue
    return None


def send_to_crm(cfg: dict[str, Any], payload: dict[str, Any]) -> dict[str, Any]:
    url = urljoin(cfg["crm_api_url"] + "/", "api/calls")
    headers = {
        "Content-Type": "application/json",
        "X-API-Key": cfg["crm_api_key"],
    }
    response = requests.post(url, json=payload, headers=headers, timeout=120)
    if response.status_code >= 400:
        raise RuntimeError(f"CRM {response.status_code}: {response.text[:500]}")
    return response.json() if response.content else {"ok": True}


def process_one(
    cfg: dict[str, Any],
    service,
    amr: dict[str, Any],
    json_files: dict[str, Any],
) -> None:
    name = amr["name"]
    print(f"[{datetime.now(timezone.utc).isoformat()}] Processing: {name}")

    temp_dir = cfg["temp_dir"]
    os.makedirs(temp_dir, exist_ok=True)
    local_audio = os.path.join(temp_dir, f"acr_{amr['id']}.amr")
    local_json = os.path.join(temp_dir, f"acr_{amr['id']}.json")

    try:
        download_file(service, amr["id"], local_audio)

        call_meta: dict[str, Any] = {}
        json_name = re.sub(r"\.amr$", ".json", name, flags=re.IGNORECASE)
        if json_name in json_files:
            download_file(service, json_files[json_name]["id"], local_json)
            with open(local_json, encoding="utf-8") as f:
                call_meta = json.load(f)
            if not isinstance(call_meta, dict):
                call_meta = {}

        text = transcribe_audio(cfg, local_audio)
        if not text:
            raise RuntimeError("Empty Whisper transcript")

        phone = extract_phone(call_meta, name)
        call_date = extract_call_date(call_meta)
        duration = extract_duration_seconds(call_meta)

        payload: dict[str, Any] = {
            "phone": phone,
            "transcript": text,
            "raw_transcript": text,
            "call_date": call_date,
            "file_name": name,
            "source": "call",
        }
        if duration is not None:
            payload["duration_seconds"] = duration

        result = send_to_crm(cfg, payload)
        print(f"  -> CRM ok: {result.get('id') or result}")
        _status["last_success_at"] = datetime.now(timezone.utc).isoformat()
        _status["processed_count"] = int(_status["processed_count"]) + 1
    finally:
        for path in (local_audio, local_json):
            try:
                if os.path.exists(path):
                    os.remove(path)
            except OSError:
                pass


def poll_once(cfg: dict[str, Any], service, folder_id: str, processed_ids: set[str]) -> None:
    amr_files, json_files = list_new_files(service, folder_id, processed_ids)
    _status["last_poll_at"] = datetime.now(timezone.utc).isoformat()
    _status["drive_ok"] = True

    if not amr_files:
        print(f"[{datetime.now(timezone.utc).isoformat()}] No new recordings.")
        return

    for amr in amr_files:
        try:
            process_one(cfg, service, amr, json_files)
            processed_ids.add(amr["id"])
            save_processed(cfg["processed_log"], processed_ids)
        except Exception as e:
            _status["last_error"] = f"{amr.get('name')}: {e}"
            print(f"  -> ERROR {amr.get('name')}: {e}")
            traceback.print_exc()
            # do not mark processed — retry next poll


def worker_loop(cfg: dict[str, Any]) -> None:
    processed_ids = load_processed(cfg["processed_log"])
    _status["processed_count"] = len(processed_ids)

    while True:
        try:
            service = get_drive_service(cfg)
            folder_id = find_folder_id(service, cfg["drive_folder_name"])
            _status["folder_id"] = folder_id
            poll_once(cfg, service, folder_id, processed_ids)
            _status["last_error"] = None
        except Exception as e:
            _status["drive_ok"] = False
            _status["last_error"] = str(e)
            print(f"Poll error: {e}")
            traceback.print_exc()

        time.sleep(cfg["check_interval"])


class HealthHandler(BaseHTTPRequestHandler):
    def log_message(self, format: str, *args: Any) -> None:  # noqa: A003
        # quieter access log
        if self.path not in ("/", "/health"):
            super().log_message(format, *args)

    def do_GET(self) -> None:  # noqa: N802
        if self.path in ("/", "/health"):
            body = json.dumps(_status, ensure_ascii=False).encode("utf-8")
            self.send_response(200 if _status.get("ok") else 503)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return
        self.send_response(404)
        self.end_headers()


def main() -> None:
    host = env_optional("HOST", "0.0.0.0")
    port = int(env_optional("PORT", "8080"))
    _status["started_at"] = datetime.now(timezone.utc).isoformat()

    # Bind health first so Azure warmup succeeds even if Drive/config fails later
    server = ThreadingHTTPServer((host, port), HealthHandler)
    threading.Thread(target=server.serve_forever, name="health-http", daemon=True).start()
    print(f"Health HTTP on {host}:{port}")

    try:
        cfg = config()
    except Exception as e:
        _status["ok"] = False
        _status["last_error"] = f"config: {e}"
        print(f"CONFIG ERROR (health still up): {e}")
        threading.Event().wait()
        return

    print(
        f"ACR worker starting. folder={cfg['drive_folder_name']!r} "
        f"interval={cfg['check_interval']}s whisper_lang={cfg['whisper_language']!r}"
    )
    t = threading.Thread(target=worker_loop, args=(cfg,), name="acr-poller", daemon=True)
    t.start()
    threading.Event().wait()


if __name__ == "__main__":
    main()
