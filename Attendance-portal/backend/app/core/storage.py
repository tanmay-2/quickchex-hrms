# ==============================================================================
# QUICKCHEX HRMS BACKEND - STORAGE.PY
# Path: Attendance-portal/backend/app/core/storage.py
# Purpose: Core backend infrastructure component for 'storage' (security, config, or utilities).
# ==============================================================================

# Import module os for system functionality
import os
# Import Path from pathlib for module operations
from pathlib import Path


# Set BACKEND_ROOT variable to store BACKEND ROOT value
BACKEND_ROOT = Path(__file__).resolve().parents[2]
# Set _configured_upload_dir variable to store  configured upload dir value
_configured_upload_dir = Path(os.getenv("UPLOAD_DIR", "uploads"))
# Set UPLOAD_ROOT variable to store UPLOAD ROOT value
UPLOAD_ROOT = (
    # Execute statement to process data and maintain state
    _configured_upload_dir
    # Evaluate condition to control execution branch
    if _configured_upload_dir.is_absolute()
    # Execute statement to process data and maintain state
    else BACKEND_ROOT / _configured_upload_dir
# Execute statement to process data and maintain state
).resolve()
