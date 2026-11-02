import subprocess, sys, os, time, re

backend_dir = r"f:\Tanmay\Quickchex\Attendance-portal\backend"
python_exe = os.path.join(backend_dir, ".venv", "Scripts", "python.exe")
cloudflared_exe = os.path.join(backend_dir, "cloudflared.exe")

print("Starting Uvicorn backend on port 8000...")
uvicorn_proc = subprocess.Popen(
    [python_exe, "-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", "8000"],
    cwd=backend_dir
)

time.sleep(3)
print("Starting Cloudflare Tunnel...")
cf_proc = subprocess.Popen(
    [cloudflared_exe, "tunnel", "--url", "http://127.0.0.1:8000", "--no-autoupdate"],
    cwd=backend_dir,
    stdout=subprocess.PIPE,
    stderr=subprocess.STDOUT,
    text=True,
    bufsize=1
)

tunnel_url = None
while True:
    line = cf_proc.stdout.readline()
    if not line:
        time.sleep(0.5)
        continue
    print(line.strip())
    match = re.search(r'https://[a-zA-Z0-9-]+\.trycloudflare\.com', line)
    if match and not tunnel_url:
        tunnel_url = match.group(0)
        with open(os.path.join(backend_dir, "active_tunnel_url.txt"), "w") as f:
            f.write(tunnel_url)
        print(f"\n>>> ACTIVE PUBLIC TUNNEL URL: {tunnel_url} <<<\n", flush=True)
