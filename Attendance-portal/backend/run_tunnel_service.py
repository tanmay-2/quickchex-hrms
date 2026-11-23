# Import module subprocess for system functionality
import subprocess
# Import module sys for system functionality
import sys
# Import module os for system functionality
import os
# Import module time for system functionality
import time
# Import module re for system functionality
import re
# Import module urllib.request for system functionality
import urllib.request

# Set backend_dir variable to store backend dir value
backend_dir = r"f:\Tanmay\Quickchex\Attendance-portal\backend"
# Set repo_root variable to store repo root value
repo_root = r"f:\Tanmay\Quickchex"
# Set python_exe variable to store python exe value
python_exe = os.path.join(backend_dir, ".venv", "Scripts", "python.exe")
# Set cloudflared_exe variable to store cloudflared exe value
cloudflared_exe = os.path.join(backend_dir, "cloudflared.exe")
# Set active_url_file variable to store active url file value
active_url_file = os.path.join(backend_dir, "active_tunnel_url.txt")
# Set log_file variable to store log file value
log_file = os.path.join(backend_dir, "tunnel_service.log")
# Set api_client_file variable to store api client file value
api_client_file = os.path.join(repo_root, "Frontend", "hrms-frontend", "src", "services", "apiClient.js")
# Set vercel_json_file variable to store vercel json file value
vercel_json_file = os.path.join(repo_root, "Frontend", "hrms-frontend", "vercel.json")

# Define log function to handle log
def log(msg):
    # Set timestamp variable to store timestamp value
    timestamp = time.strftime("[%Y-%m-%d %H:%M:%S]")
    # Set line variable to store line value
    line = f"{timestamp} {msg}\n"
    # Invoke print to perform operational action
    print(line, end="", flush=True)
    # Begin guarded execution block to trap exceptions
    try:
        # Acquire context manager resource for enclosed block
        with open(log_file, "a", encoding="utf-8") as f:
            # Invoke f.write to perform operational action
            f.write(line)
    # Catch and handle specific exception if raised
    except Exception:
        # Placeholder statement performing no operation
        pass

# Define is_port_in_use function to handle is port in use
def is_port_in_use(port):
    # Import module socket for system functionality
    import socket
    # Acquire context manager resource for enclosed block
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        # Return computed result or response payload to caller
        return s.connect_ex(('127.0.0.1', port)) == 0

# Define is_url_alive function to handle is url alive
def is_url_alive(url):
    # Begin guarded execution block to trap exceptions
    try:
        # Set req variable to store req value
        req = urllib.request.Request(f"{url}/health", headers={"User-Agent": "QuickchexTunnelMonitor/1.0"})
        # Acquire context manager resource for enclosed block
        with urllib.request.urlopen(req, timeout=8) as resp:
            # Return computed result or response payload to caller
            return resp.status == 200
    # Catch and handle specific exception if raised
    except Exception:
        # Return computed result or response payload to caller
        return False

# Define update_frontend_with_tunnel_url function to handle update frontend with tunnel url
def update_frontend_with_tunnel_url(new_url):
    # Invoke log to perform operational action
    log(f"Updating Vercel cloud proxy with new tunnel URL: {new_url}")

    # 1. Update vercel.json (rewrites destination)
    if os.path.exists(vercel_json_file):
        # Acquire context manager resource for enclosed block
        with open(vercel_json_file, "r", encoding="utf-8") as f:
            # Set v_content variable to store v content value
            v_content = f.read()

        # Set updated_v variable to store updated v value
        updated_v = re.sub(
            # Execute statement to process data and maintain state
            r'https://[a-zA-Z0-9-]+\.trycloudflare\.com',
            # Execute statement to process data and maintain state
            new_url,
            # Execute statement to process data and maintain state
            v_content
        # Execute statement to process data and maintain state
        )
        # Acquire context manager resource for enclosed block
        with open(vercel_json_file, "w", encoding="utf-8") as f:
            # Invoke f.write to perform operational action
            f.write(updated_v)
        # Invoke log to perform operational action
        log("Updated vercel.json successfully.")

    # 2. Push to GitHub so Vercel auto-deploys cloud proxy
    try:
        # Invoke log to perform operational action
        log("Pushing updated cloud proxy configuration to GitHub...")
        # Execute statement to process data and maintain state
        subprocess.run(
            # Execute statement to process data and maintain state
            ["git", "add", "Frontend/hrms-frontend/vercel.json"],
            # Set cwd variable to store cwd value
            cwd=repo_root,
            # Set check variable to store check value
            check=True,
            # Set capture_output variable to store capture output value
            capture_output=True
        # Execute statement to process data and maintain state
        )
        # Set commit_res variable to store commit res value
        commit_res = subprocess.run(
            # Execute statement to process data and maintain state
            ["git", "commit", "-m", f"chore(tunnel): auto-sync Vercel cloud proxy to {new_url}"],
            # Set cwd variable to store cwd value
            cwd=repo_root,
            # Set capture_output variable to store capture output value
            capture_output=True,
            # Set text variable to store text value
            text=True
        # Execute statement to process data and maintain state
        )
        # Check if target condition is false or object is missing
        if "nothing to commit" not in commit_res.stdout:
            # Invoke subprocess.run to perform operational action
            subprocess.run(["git", "push", "origin", "main"], cwd=repo_root, check=True, capture_output=True)
            # Invoke log to perform operational action
            log("Pushed to GitHub successfully! Vercel is auto-deploying the new cloud proxy route.")
        # Execute fallback branch when conditions are not met
        else:
            # Invoke log to perform operational action
            log("GitHub already up-to-date with this URL.")
    # Catch and handle specific exception if raised
    except Exception as e:
        # Invoke log to perform operational action
        log(f"Warning: Failed to git push URL: {e}")

# Define run_single_session function to handle run single session
def run_single_session():
    # Terminate any orphaned cloudflared processes from prior runs
    try:
        # Invoke subprocess.run to perform operational action
        subprocess.run(["taskkill", "/F", "/IM", "cloudflared.exe"], capture_output=True)
    # Catch and handle specific exception if raised
    except Exception:
        # Placeholder statement performing no operation
        pass

    # 1. Ensure Uvicorn is running
    uvicorn_proc = None
    # Check if target condition is false or object is missing
    if not is_port_in_use(8000):
        # Invoke log to perform operational action
        log("Starting Uvicorn backend on port 8000...")
        # Set uvicorn_proc variable to store uvicorn proc value
        uvicorn_proc = subprocess.Popen(
            # Execute statement to process data and maintain state
            [python_exe, "-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", "8000"],
            # Set cwd variable to store cwd value
            cwd=backend_dir
        # Execute statement to process data and maintain state
        )
    # Execute fallback branch when conditions are not met
    else:
        # Invoke log to perform operational action
        log("Uvicorn is already active on port 8000.")

    # Invoke time.sleep to perform operational action
    time.sleep(3)

    # 2. Start Cloudflare Quick Tunnel
    log("Starting Cloudflare Tunnel...")
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
    # Set old_url variable to store old url value
    old_url = None
    # Evaluate condition to control execution branch
    if os.path.exists(active_url_file):
        # Begin guarded execution block to trap exceptions
        try:
            # Acquire context manager resource for enclosed block
            with open(active_url_file, "r", encoding="utf-8") as f:
                # Set old_url variable to store old url value
                old_url = f.read().strip()
        # Catch and handle specific exception if raised
        except Exception:
            # Placeholder statement performing no operation
            pass

    # Set last_health_check variable to store last health check value
    last_health_check = time.time()
    # Set fail_count variable to store fail count value
    fail_count = 0

    # Execute loop while boolean condition remains true
    while True:
        # Check uvicorn process
        if uvicorn_proc and uvicorn_proc.poll() is not None:
            # Invoke log to perform operational action
            log("Uvicorn backend stopped unexpectedly. Restarting on port 8000...")
            # Set uvicorn_proc variable to store uvicorn proc value
            uvicorn_proc = subprocess.Popen(
                # Execute statement to process data and maintain state
                [python_exe, "-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", "8000"],
                # Set cwd variable to store cwd value
                cwd=backend_dir
            # Execute statement to process data and maintain state
            )

        # Check cloudflared process
        if cf_proc.poll() is not None:
            # Invoke log to perform operational action
            log("Cloudflare process exited. Will restart session...")
            # Break out of current loop early
            break

        # Set line variable to store line value
        line = cf_proc.stdout.readline()
        # Evaluate condition to control execution branch
        if line:
            # Set match variable to store match value
            match = re.search(r'https://[a-zA-Z0-9-]+\.trycloudflare\.com', line)
            # Evaluate condition to control execution branch
            if match:
                # Set detected_url variable to store detected url value
                detected_url = match.group(0)
                # Evaluate condition to control execution branch
                if detected_url != "https://api.trycloudflare.com" and detected_url != tunnel_url:
                    # Set tunnel_url variable to store tunnel url value
                    tunnel_url = detected_url
                    # Invoke log to perform operational action
                    log(f">>> ACTIVE TUNNEL URL DETECTED: {tunnel_url} <<<")

                    # Acquire context manager resource for enclosed block
                    with open(active_url_file, "w", encoding="utf-8") as f:
                        # Invoke f.write to perform operational action
                        f.write(tunnel_url)

                    # Evaluate condition to control execution branch
                    if tunnel_url != old_url:
                        # Invoke update_frontend_with_tunnel_url to perform operational action
                        update_frontend_with_tunnel_url(tunnel_url)
                        # Set old_url variable to store old url value
                        old_url = tunnel_url
                    # Execute fallback branch when conditions are not met
                    else:
                        # Invoke log to perform operational action
                        log("Active URL matches existing configuration. No sync needed.")

        # Watchdog: Every 30s check if tunnel is alive
        if tunnel_url and (time.time() - last_health_check > 30):
            # Set last_health_check variable to store last health check value
            last_health_check = time.time()
            # Check if target condition is false or object is missing
            if not is_url_alive(tunnel_url):
                # Execute statement to process data and maintain state
                fail_count += 1
                # Invoke log to perform operational action
                log(f"Tunnel health check warning ({fail_count}/2) for {tunnel_url}")
                # Evaluate condition to control execution branch
                if fail_count >= 2:
                    # Invoke log to perform operational action
                    log("Tunnel unreachable (network/sleep change detected). Restarting tunnel...")
                    # Begin guarded execution block to trap exceptions
                    try:
                        # Invoke cf_proc.terminate to perform operational action
                        cf_proc.terminate()
                        # Invoke cf_proc.wait to perform operational action
                        cf_proc.wait(timeout=3)
                    # Catch and handle specific exception if raised
                    except Exception:
                        # Begin guarded execution block to trap exceptions
                        try:
                            # Invoke cf_proc.kill to perform operational action
                            cf_proc.kill()
                        # Catch and handle specific exception if raised
                        except Exception:
                            # Placeholder statement performing no operation
                            pass
                    # Break out of current loop early
                    break
            # Execute fallback branch when conditions are not met
            else:
                # Set fail_count variable to store fail count value
                fail_count = 0

        # Invoke time.sleep to perform operational action
        time.sleep(0.1)

    # Clean termination before returning to loop
    try:
        # Invoke cf_proc.terminate to perform operational action
        cf_proc.terminate()
        # Invoke cf_proc.wait to perform operational action
        cf_proc.wait(timeout=2)
    # Catch and handle specific exception if raised
    except Exception:
        # Placeholder statement performing no operation
        pass

# Define main function to handle main
def main():
    # Invoke log to perform operational action
    log("=== Quickchex Backend & Tunnel Auto-Runner Starting ===")
    # Execute loop while boolean condition remains true
    while True:
        # Begin guarded execution block to trap exceptions
        try:
            # Invoke run_single_session to perform operational action
            run_single_session()
        # Catch and handle specific exception if raised
        except Exception as e:
            # Invoke log to perform operational action
            log(f"Unexpected error in tunnel session: {e}")
        # Invoke log to perform operational action
        log("Restarting session in 5 seconds...")
        # Invoke time.sleep to perform operational action
        time.sleep(5)

# Evaluate condition to control execution branch
if __name__ == "__main__":
    # Invoke main to perform operational action
    main()
