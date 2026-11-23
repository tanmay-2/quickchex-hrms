# ==============================================================================
# QUICKCHEX HRMS BACKEND - VERIFY_ROUTES.PY
# Path: Attendance-portal/backend/verify_routes.py
# Purpose: Backend module.
# ==============================================================================

# Import app from app.main for module operations
from app.main import app

# Set routes variable to store routes value
routes = []
# Iterate through items in sequence loop
for r in app.routes:
    # Evaluate condition to control execution branch
    if hasattr(r, "path"):
        # Set methods variable to store methods value
        methods = ",".join(r.methods) if hasattr(r, "methods") and r.methods else ""
        # Invoke routes.append to perform operational action
        routes.append(f"{methods:10} {r.path}")

# Invoke routes.sort to perform operational action
routes.sort(key=lambda x: x.split()[1] if len(x.split()) > 1 else x)
# Iterate through items in sequence loop
for r in routes:
    # Invoke print to perform operational action
    print(r)
