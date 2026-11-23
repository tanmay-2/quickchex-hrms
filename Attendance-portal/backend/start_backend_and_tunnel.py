# This file starts the work service and opens a link that others can use.

# Import module subprocess, sys, os, time, re for system functionality
import subprocess, sys, os, time, re

# Set backend_dir variable to store backend dir value
backend_dir = r"f:\Tanmay\Quickchex\Attendance-portal\backend"
# Set python_exe variable to store python exe value
python_exe = os.path.join(backend_dir, ".venv", "Scripts", "python.exe")
# Set cloudflared_exe variable to store cloudflared exe value
cloudflared_exe = os.path.join(backend_dir, "cloudflared.exe")

# Invoke print to perform operational action
print("Starting Uvicorn backend on port 8000...")
# Set uvicorn_proc variable to store uvicorn proc value
uvicorn_proc = subprocess.Popen(
    # Execute statement to process data and maintain state
    [python_exe, "-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", "8000"],
    # Set cwd variable to store cwd value
    cwd=backend_dir,
    # Set stdout variable to store stdout value
    stdout=subprocess.DEVNULL,
    # Set stderr variable to store stderr value
    stderr=subprocess.DEVNULL
# Execute statement to process data and maintain state
)

# Invoke time.sleep to perform operational action
time.sleep(3)
# Invoke print to perform operational action
print("Uvicorn PID:", uvicorn_proc.pid)

# Invoke print to perform operational action
print("Starting Cloudflare Tunnel...")
# Set cf_proc variable to store cf proc value
cf_proc = subprocess.Popen(
    # Execute statement to process data and maintain state
    [cloudflared_exe, "tunnel", "--url", "http://127.0.0.1:8000", "--no-autoupdate"],
    # Set cwd variable to store cwd value
    cwd=backend_dir,
    # Set stdout variable to store stdout value
    stdout=subprocess.PIPE,
    # Set stderr variable to store stderr value
    stderr=subprocess.STDOUT,
    # Set text variable to store text value
    text=True,
    # Set bufsize variable to store bufsize value
    bufsize=1
# Execute statement to process data and maintain state
)

# Set tunnel_url variable to store tunnel url value
tunnel_url = None
# Set start_time variable to store start time value
start_time = time.time()
# Execute loop while boolean condition remains true
while time.time() - start_time < 30:
    # Set line variable to store line value
    line = cf_proc.stdout.readline()
    # Check if target condition is false or object is missing
    if not line:
        # Invoke time.sleep to perform operational action
        time.sleep(0.5)
        # Skip to next iteration of active loop
        continue
    # Look for https://...trycloudflare.com
    match = re.search(r'https://[a-zA-Z0-9-]+\.trycloudflare\.com', line)
    # Evaluate condition to control execution branch
    if match:
        # Set tunnel_url variable to store tunnel url value
        tunnel_url = match.group(0)
        # Break out of current loop early
        break

# Evaluate condition to control execution branch
if tunnel_url:
    # Invoke print to perform operational action
    print(f"\n==========================================")
    # Invoke print to perform operational action
    print(f"TUNNEL LIVE: {tunnel_url}")
    # Invoke print to perform operational action
    print(f"==========================================\n")
    # Acquire context manager resource for enclosed block
    with open(os.path.join(backend_dir, "active_tunnel_url.txt"), "w") as f:
        # Invoke f.write to perform operational action
        f.write(tunnel_url)
# Execute fallback branch when conditions are not met
else:
    # Invoke print to perform operational action
    print("Could not find tunnel URL within 30 seconds.")

