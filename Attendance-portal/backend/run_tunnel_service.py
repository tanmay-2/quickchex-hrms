import subprocess
import sys
import os
import time
import re
import urllib.request

backend_dir = r"f:\Tanmay\Quickchex\Attendance-portal\backend"
repo_root = r"f:\Tanmay\Quickchex"
python_exe = os.path.join(backend_dir, ".venv", "Scripts", "python.exe")
cloudflared_exe = os.path.join(backend_dir, "cloudflared.exe")
active_url_file = os.path.join(backend_dir, "active_tunnel_url.txt")
log_file = os.path.join(backend_dir, "tunnel_service.log")
api_client_file = os.path.join(repo_root, "Frontend", "hrms-frontend", "src", "services", "apiClient.js")
vercel_json_file = os.path.join(repo_root, "Frontend", "hrms-frontend", "vercel.json")

def log(msg):
    timestamp = time.strftime("[%Y-%m-%d %H:%M:%S]")
    line = f"{timestamp} {msg}\n"
    print(line, end="", flush=True)
    try:
        with open(log_file, "a", encoding="utf-8") as f:
            f.write(line)
    except Exception:
        pass

def is_port_in_use(port):
    import socket
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        return s.connect_ex(('127.0.0.1', port)) == 0

def is_url_alive(url):
    try:
        req = urllib.request.Request(f"{url}/health", headers={"User-Agent": "QuickchexTunnelMonitor/1.0"})
        with urllib.request.urlopen(req, timeout=8) as resp:
            return resp.status == 200
    except Exception:
        return False

def update_frontend_with_tunnel_url(new_url):
    log(f"Updating frontend configuration with new tunnel URL: {new_url}")

    # 1. Update apiClient.js
    if os.path.exists(api_client_file):
        with open(api_client_file, "r", encoding="utf-8") as f:
            content = f.read()

        updated_content = re.sub(
            r'https://[a-zA-Z0-9-]+\.trycloudflare\.com',
            new_url,
            content
        )
        with open(api_client_file, "w", encoding="utf-8") as f:
            f.write(updated_content)
        log("Updated apiClient.js successfully.")

    # 2. Update vercel.json
    if os.path.exists(vercel_json_file):
        with open(vercel_json_file, "r", encoding="utf-8") as f:
            v_content = f.read()

        updated_v = re.sub(
            r'https://[a-zA-Z0-9-]+\.trycloudflare\.com',
            new_url,
            v_content
        )
        with open(vercel_json_file, "w", encoding="utf-8") as f:
            f.write(updated_v)
        log("Updated vercel.json successfully.")

    # 3. Push to GitHub so Vercel auto-deploys
    try:
        log("Pushing updated URL to GitHub...")
        subprocess.run(
            ["git", "add", "Frontend/hrms-frontend/src/services/apiClient.js", "Frontend/hrms-frontend/vercel.json"],
            cwd=repo_root,
            check=True,
            capture_output=True
        )
        commit_res = subprocess.run(
            ["git", "commit", "-m", f"chore(tunnel): auto-sync Cloudflare tunnel URL to {new_url}"],
            cwd=repo_root,
            capture_output=True,
            text=True
        )
        if "nothing to commit" not in commit_res.stdout:
            subprocess.run(["git", "push", "origin", "main"], cwd=repo_root, check=True, capture_output=True)
            log("Pushed to GitHub successfully! Vercel is auto-deploying the new URL.")
        else:
            log("GitHub already up-to-date with this URL.")
    except Exception as e:
        log(f"Warning: Failed to git push URL: {e}")

def main():
    log("=== Quickchex Backend & Tunnel Auto-Runner Starting ===")

    # Terminate any orphaned cloudflared processes from prior runs
    try:
        subprocess.run(["taskkill", "/F", "/IM", "cloudflared.exe"], capture_output=True)
    except Exception:
        pass

    # 1. Ensure Uvicorn is running
    uvicorn_proc = None
    if not is_port_in_use(8000):
        log("Starting Uvicorn backend on port 8000...")
        uvicorn_proc = subprocess.Popen(
            [python_exe, "-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", "8000"],
            cwd=backend_dir
        )
    else:
        log("Uvicorn is already active on port 8000.")

    time.sleep(3)

    # 2. Start Cloudflare Quick Tunnel
    log("Starting Cloudflare Tunnel...")
    cf_proc = subprocess.Popen(
        [cloudflared_exe, "tunnel", "--url", "http://127.0.0.1:8000", "--no-autoupdate"],
        cwd=backend_dir,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        bufsize=1
    )

    tunnel_url = None
    old_url = None
    if os.path.exists(active_url_file):
        try:
            with open(active_url_file, "r", encoding="utf-8") as f:
                old_url = f.read().strip()
        except Exception:
            pass

    last_health_check = time.time()
    fail_count = 0

    while True:
        # Check uvicorn process
        if uvicorn_proc and uvicorn_proc.poll() is not None:
            log("Uvicorn backend stopped unexpectedly. Restarting on port 8000...")
            uvicorn_proc = subprocess.Popen(
                [python_exe, "-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", "8000"],
                cwd=backend_dir
            )

        # Check cloudflared process
        if cf_proc.poll() is not None:
            log("Cloudflare process exited. Restarting in 5s...")
            time.sleep(5)
            return main()

        line = cf_proc.stdout.readline()
        if line:
            match = re.search(r'https://[a-zA-Z0-9-]+\.trycloudflare\.com', line)
            if match:
                detected_url = match.group(0)
                if detected_url != tunnel_url:
                    tunnel_url = detected_url
                    log(f">>> ACTIVE TUNNEL URL DETECTED: {tunnel_url} <<<")

                    with open(active_url_file, "w", encoding="utf-8") as f:
                        f.write(tunnel_url)

                    if tunnel_url != old_url:
                        update_frontend_with_tunnel_url(tunnel_url)
                        old_url = tunnel_url
                    else:
                        log("Active URL matches existing configuration. No sync needed.")

        # Watchdog: Every 30s check if tunnel is alive
        if tunnel_url and (time.time() - last_health_check > 30):
            last_health_check = time.time()
            if not is_url_alive(tunnel_url):
                fail_count += 1
                log(f"Tunnel health check warning ({fail_count}/2) for {tunnel_url}")
                if fail_count >= 2:
                    log("Tunnel unreachable (network/sleep change detected). Restarting tunnel...")
                    try:
                        cf_proc.terminate()
                        cf_proc.wait(timeout=3)
                    except Exception:
                        try:
                            cf_proc.kill()
                        except Exception:
                            pass
                    time.sleep(3)
                    return main()
            else:
                fail_count = 0

        time.sleep(0.1)

if __name__ == "__main__":
    main()
