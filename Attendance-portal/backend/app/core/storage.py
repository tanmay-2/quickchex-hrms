import os
from pathlib import Path


BACKEND_ROOT = Path(__file__).resolve().parents[2]
_configured_upload_dir = Path(os.getenv("UPLOAD_DIR", "uploads"))
UPLOAD_ROOT = (
    _configured_upload_dir
    if _configured_upload_dir.is_absolute()
    else BACKEND_ROOT / _configured_upload_dir
).resolve()
