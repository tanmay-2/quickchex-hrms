r"""
=============================================================================
  Quickchex / La Esfera HRMS - complete UI update
=============================================================================

ONE FILE. Run it once. It does everything.

  1. Put this file in:  Frontend\hrms-frontend\
     (the folder containing package.json and the src folder)

  2. Open cmd there and run:

         python update_ui.py

  3. npm run dev, then hard-refresh the browser with Ctrl+Shift+R


WHAT IT DOES
------------
  * Installs the design token system (light + dark) and UI primitives
  * Retrofits every existing page so all 37 screens theme correctly
  * Rebuilds the admin sidebar: light surface, grouped sections,
    open/close pin, dark-mode switch at the bottom
  * Replaces every Font Awesome / Lucide icon with Phosphor duotone
  * Repairs the broken imports that make `npm run build` fail on Linux

SAFETY
------
  * Every file it touches is copied to  _ui_backup_<timestamp>\  first
  * Safe to run twice - it skips anything already done
  * Run with  --undo  to restore the most recent backup

=============================================================================
"""

import base64
import io
import os
import re
import shutil
import sys
import time

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, "src")

GREEN = ""
RESET = ""


def line(char="-", n=74):
    print("  " + char * n)


def step(text):
    print("")
    print("  " + text)
    line()


# ---------------------------------------------------------------------------
# Sanity checks
# ---------------------------------------------------------------------------
if not os.path.isdir(SRC) or not os.path.exists(os.path.join(HERE, "package.json")):
    print("")
    print("  ERROR: this file is in the wrong place.")
    print("")
    print("  Put update_ui.py in the folder that contains BOTH:")
    print("      package.json")
    print("      src\\")
    print("")
    print("  That is usually:")
    print("      D:\\Aaquib\\Quickchex\\Frontend\\hrms-frontend\\")
    print("")
    sys.exit(1)


# ---------------------------------------------------------------------------
# Undo
# ---------------------------------------------------------------------------
def find_backups():
    return sorted(
        d for d in os.listdir(HERE)
        if d.startswith("_ui_backup_") and os.path.isdir(os.path.join(HERE, d))
    )


if "--undo" in sys.argv:
    backups = find_backups()
    if not backups:
        sys.exit("  Nothing to undo - no _ui_backup_* folder found.")
    latest = os.path.join(HERE, backups[-1])
    print("")
    print("  Restoring from " + backups[-1])
    restored = 0
    for dp, _, fs in os.walk(latest):
        for f in fs:
            src_file = os.path.join(dp, f)
            rel = os.path.relpath(src_file, latest)
            dest = os.path.join(HERE, rel)
            os.makedirs(os.path.dirname(dest), exist_ok=True)
            shutil.copy2(src_file, dest)
            restored += 1
    print("  Restored %d files. Restart the dev server." % restored)
    print("")
    sys.exit(0)


BACKUP = os.path.join(HERE, "_ui_backup_" + time.strftime("%Y%m%d_%H%M%S"))


def backup(path):
    """Copy a file into the backup folder, preserving its relative path."""
    if not os.path.exists(path):
        return
    rel = os.path.relpath(path, HERE)
    dest = os.path.join(BACKUP, rel)
    os.makedirs(os.path.dirname(dest), exist_ok=True)
    if not os.path.exists(dest):
        shutil.copy2(path, dest)


print("")
line("=")
print("  Quickchex UI update")
line("=")


# ---------------------------------------------------------------------------
# Embedded files (base64 so nothing can be mangled by copy/paste)
# ---------------------------------------------------------------------------
FILES = {
    "src/components/sidebar/Sidebar.jsx": (
        "aW1wb3J0IHsgdXNlU3RhdGUsIHVzZUVmZmVjdCB9IGZyb20gInJlYWN0IjsKaW1wb3J0IHsgdXNlTmF2aWdhdGUsIHVzZUxv"
        "Y2F0aW9uIH0gZnJvbSAicmVhY3Qtcm91dGVyLWRvbSI7CmltcG9ydCB7CiAgUGlTcXVhcmVzRm91ckR1b3RvbmUsCiAgUGlV"
        "c2Vyc1RocmVlRHVvdG9uZSwKICBQaUlkZW50aWZpY2F0aW9uQ2FyZER1b3RvbmUsCiAgUGlUaWNrZXREdW90b25lLAogIFBp"
        "Q2FsZW5kYXJCbGFua0R1b3RvbmUsCiAgUGlDbG9ja1VzZXJEdW90b25lLAogIFBpQWlycGxhbmVUaWx0RHVvdG9uZSwKICBQ"
        "aUN1cnJlbmN5Q2lyY2xlRG9sbGFyRHVvdG9uZSwKICBQaVJlY2VpcHREdW90b25lLAogIFBpVXNlck1pbnVzRHVvdG9uZSwK"
        "ICBQaVByb2hpYml0RHVvdG9uZSwKICBQaUhvdXJnbGFzc01lZGl1bUR1b3RvbmUsCiAgUGlTaWRlYmFyU2ltcGxlRHVvdG9u"
        "ZSwKICBQaU1vb25EdW90b25lLAogIFBpU3VuRHVvdG9uZSwKfSBmcm9tICJyZWFjdC1pY29ucy9waSI7CgppbXBvcnQgeyB1"
        "c2VUaGVtZSB9IGZyb20gIi4uLy4uL3RoZW1lL1RoZW1lUHJvdmlkZXIiOwppbXBvcnQgIi4vc2lkZWJhci5jc3MiOwppbXBv"
        "cnQgbG9nbyBmcm9tICIuLi8uLi9hc3NldHMvaW1nL2xvZ28ucG5nIjsKCmNvbnN0IEdST1VQUyA9IFsKICB7CiAgICBpdGVt"
        "czogW3sgaWNvbjogPFBpU3F1YXJlc0ZvdXJEdW90b25lIC8+LCBsYWJlbDogIkRhc2hib2FyZCIsIHBhdGg6ICIvZGFzaGJv"
        "YXJkIiB9XSwKICB9LAogIHsKICAgIGhlYWRpbmc6ICJPcmdhbmlzYXRpb24iLAogICAgaXRlbXM6IFsKICAgICAgeyBpY29u"
        "OiA8UGlVc2Vyc1RocmVlRHVvdG9uZSAvPiwgbGFiZWw6ICJFbXBsb3llZSBkaXJlY3RvcnkiLCBwYXRoOiAiL2Rhc2hib2Fy"
        "ZC9lbXBsb3llZXMiIH0sCiAgICAgIHsgaWNvbjogPFBpSWRlbnRpZmljYXRpb25DYXJkRHVvdG9uZSAvPiwgbGFiZWw6ICJD"
        "b21wYW55IHBvbGljaWVzIiwgcGF0aDogIi9kYXNoYm9hcmQvcG9saWNpZXMiIH0sCiAgICAgIHsgaWNvbjogPFBpVGlja2V0"
        "RHVvdG9uZSAvPiwgbGFiZWw6ICJUaWNrZXRzIiwgcGF0aDogIi90aWNrZXRzL2FsbCIgfSwKICAgICAgeyBpY29uOiA8UGlD"
        "YWxlbmRhckJsYW5rRHVvdG9uZSAvPiwgbGFiZWw6ICJIb2xpZGF5cyIsIHBhdGg6ICIvZGFzaGJvYXJkL2hvbGlkYXlzIiB9"
        "LAogICAgXSwKICB9LAogIHsKICAgIGhlYWRpbmc6ICJBdHRlbmRhbmNlIiwKICAgIGl0ZW1zOiBbCiAgICAgIHsgaWNvbjog"
        "PFBpQ2xvY2tVc2VyRHVvdG9uZSAvPiwgbGFiZWw6ICJBdHRlbmRhbmNlIiwgcGF0aDogIi9kYXNoYm9hcmQvYWxsX2VtcF9h"
        "dHRlbmRhbmNlIiB9LAogICAgICB7IGljb246IDxQaUFpcnBsYW5lVGlsdER1b3RvbmUgLz4sIGxhYmVsOiAiTGVhdmUiLCBw"
        "YXRoOiAiL2Rhc2hib2FyZC9sZWF2ZSIgfSwKICAgIF0sCiAgfSwKICB7CiAgICBoZWFkaW5nOiAiUGF5cm9sbCIsCiAgICBp"
        "dGVtczogWwogICAgICB7IGljb246IDxQaUN1cnJlbmN5Q2lyY2xlRG9sbGFyRHVvdG9uZSAvPiwgbGFiZWw6ICJFbXBsb3ll"
        "ZSBzYWxhcnkiLCBwYXRoOiAiL2Rhc2hib2FyZC9zYWxhcnkiIH0sCiAgICAgIHsgaWNvbjogPFBpUmVjZWlwdER1b3RvbmUg"
        "Lz4sIGxhYmVsOiAiUGF5cm9sbCBpdGVtcyIsIHBhdGg6ICIvZGFzaGJvYXJkL3BheXJvbGwtaXRlbXMiIH0sCiAgICBdLAog"
        "IH0sCiAgewogICAgaGVhZGluZzogIk9mZmJvYXJkaW5nIiwKICAgIGl0ZW1zOiBbCiAgICAgIHsgaWNvbjogPFBpVXNlck1p"
        "bnVzRHVvdG9uZSAvPiwgbGFiZWw6ICJSZXNpZ25hdGlvbiIsIHBhdGg6ICIvZGFzaGJvYXJkL3Jlc2lnbmF0aW9uIiB9LAog"
        "ICAgICB7IGljb246IDxQaVByb2hpYml0RHVvdG9uZSAvPiwgbGFiZWw6ICJUZXJtaW5hdGlvbiIsIHBhdGg6ICIvZGFzaGJv"
        "YXJkL3Rlcm1pbmF0aW9uIiB9LAogICAgICB7IGljb246IDxQaUhvdXJnbGFzc01lZGl1bUR1b3RvbmUgLz4sIGxhYmVsOiAi"
        "Tm90aWNlIHBlcmlvZCIsIHBhdGg6ICIvZGFzaGJvYXJkL25vdGljZS1wZXJpb2QiIH0sCiAgICBdLAogIH0sCl07Cgpjb25z"
        "dCBQSU5fS0VZID0gImxhZXNmZXJhLXNpZGViYXItcGlubmVkIjsKCmZ1bmN0aW9uIFNpZGViYXIoeyBleHBhbmRlZCwgc2V0"
        "RXhwYW5kZWQgfSkgewogIGNvbnN0IG5hdmlnYXRlID0gdXNlTmF2aWdhdGUoKTsKICBjb25zdCBsb2NhdGlvbiA9IHVzZUxv"
        "Y2F0aW9uKCk7CiAgY29uc3QgeyB0aGVtZSwgdG9nZ2xlVGhlbWUgfSA9IHVzZVRoZW1lKCk7CiAgY29uc3QgaXNEYXJrID0g"
        "dGhlbWUgPT09ICJkYXJrIjsKCiAgY29uc3QgW3Bpbm5lZCwgc2V0UGlubmVkXSA9IHVzZVN0YXRlKCgpID0+IHsKICAgIHRy"
        "eSB7CiAgICAgIHJldHVybiB3aW5kb3cubG9jYWxTdG9yYWdlLmdldEl0ZW0oUElOX0tFWSkgPT09ICJ0cnVlIjsKICAgIH0g"
        "Y2F0Y2ggewogICAgICByZXR1cm4gZmFsc2U7CiAgICB9CiAgfSk7CgogIHVzZUVmZmVjdCgoKSA9PiB7CiAgICB0cnkgewog"
        "ICAgICB3aW5kb3cubG9jYWxTdG9yYWdlLnNldEl0ZW0oUElOX0tFWSwgU3RyaW5nKHBpbm5lZCkpOwogICAgfSBjYXRjaCB7"
        "CiAgICAgIC8qIHN0b3JhZ2UgdW5hdmFpbGFibGUgLSB0aGUgcGluIHN0aWxsIHdvcmtzIGZvciB0aGlzIHNlc3Npb24gKi8K"
        "ICAgIH0KICAgIHNldEV4cGFuZGVkKHBpbm5lZCk7CiAgfSwgW3Bpbm5lZCwgc2V0RXhwYW5kZWRdKTsKCiAgY29uc3Qgb3Bl"
        "biA9IGV4cGFuZGVkIHx8IHBpbm5lZDsKCiAgcmV0dXJuICgKICAgIDxhc2lkZQogICAgICBjbGFzc05hbWU9e2BzaWRlYmFy"
        "ICR7b3BlbiA/ICJleHBhbmRlZCIgOiAiIn0gJHtwaW5uZWQgPyAicGlubmVkIiA6ICIifWB9CiAgICAgIG9uTW91c2VFbnRl"
        "cj17KCkgPT4gIXBpbm5lZCAmJiBzZXRFeHBhbmRlZCh0cnVlKX0KICAgICAgb25Nb3VzZUxlYXZlPXsoKSA9PiAhcGlubmVk"
        "ICYmIHNldEV4cGFuZGVkKGZhbHNlKX0KICAgICAgYXJpYS1sYWJlbD0iTWFpbiBuYXZpZ2F0aW9uIgogICAgPgogICAgICA8"
        "ZGl2IGNsYXNzTmFtZT0ic2ItdG9wIj4KICAgICAgICA8ZGl2IGNsYXNzTmFtZT0ic2ItYnJhbmQiPgogICAgICAgICAgPGlt"
        "ZyBzcmM9e2xvZ299IGFsdD0iIiAvPgogICAgICAgICAge29wZW4gJiYgPHNwYW4gY2xhc3NOYW1lPSJzYi1icmFuZC1uYW1l"
        "Ij5MQSBFU0ZFUkE8L3NwYW4+fQogICAgICAgIDwvZGl2PgoKICAgICAgICB7b3BlbiAmJiAoCiAgICAgICAgICA8YnV0dG9u"
        "CiAgICAgICAgICAgIHR5cGU9ImJ1dHRvbiIKICAgICAgICAgICAgY2xhc3NOYW1lPSJzYi1waW4iCiAgICAgICAgICAgIG9u"
        "Q2xpY2s9eygpID0+IHNldFBpbm5lZCgocCkgPT4gIXApfQogICAgICAgICAgICB0aXRsZT17cGlubmVkID8gIlVucGluIHNp"
        "ZGViYXIiIDogIktlZXAgc2lkZWJhciBvcGVuIn0KICAgICAgICAgICAgYXJpYS1sYWJlbD17cGlubmVkID8gIlVucGluIHNp"
        "ZGViYXIiIDogIktlZXAgc2lkZWJhciBvcGVuIn0KICAgICAgICAgICAgYXJpYS1wcmVzc2VkPXtwaW5uZWR9CiAgICAgICAg"
        "ICA+CiAgICAgICAgICAgIDxQaVNpZGViYXJTaW1wbGVEdW90b25lIC8+CiAgICAgICAgICA8L2J1dHRvbj4KICAgICAgICAp"
        "fQogICAgICA8L2Rpdj4KCiAgICAgIDxuYXYgY2xhc3NOYW1lPSJzYi1uYXYiPgogICAgICAgIHtHUk9VUFMubWFwKChncm91"
        "cCwgZ2kpID0+ICgKICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPSJzYi1ncm91cCIga2V5PXtnaX0+CiAgICAgICAgICAgIHtn"
        "cm91cC5oZWFkaW5nICYmIG9wZW4gJiYgPGRpdiBjbGFzc05hbWU9InNiLWhlYWRpbmciPntncm91cC5oZWFkaW5nfTwvZGl2"
        "Pn0KICAgICAgICAgICAge2dyb3VwLmhlYWRpbmcgJiYgIW9wZW4gJiYgPGRpdiBjbGFzc05hbWU9InNiLXJ1bGUiIGFyaWEt"
        "aGlkZGVuPSJ0cnVlIiAvPn0KCiAgICAgICAgICAgIHtncm91cC5pdGVtcy5tYXAoKGl0ZW0pID0+IHsKICAgICAgICAgICAg"
        "ICBjb25zdCBhY3RpdmUgPSBsb2NhdGlvbi5wYXRobmFtZSA9PT0gaXRlbS5wYXRoOwogICAgICAgICAgICAgIHJldHVybiAo"
        "CiAgICAgICAgICAgICAgICA8YnV0dG9uCiAgICAgICAgICAgICAgICAgIHR5cGU9ImJ1dHRvbiIKICAgICAgICAgICAgICAg"
        "ICAga2V5PXtpdGVtLnBhdGh9CiAgICAgICAgICAgICAgICAgIGNsYXNzTmFtZT17YG1lbnUtaXRlbSAke2FjdGl2ZSA/ICJh"
        "Y3RpdmUiIDogIiJ9YH0KICAgICAgICAgICAgICAgICAgb25DbGljaz17KCkgPT4gbmF2aWdhdGUoaXRlbS5wYXRoKX0KICAg"
        "ICAgICAgICAgICAgICAgdGl0bGU9e29wZW4gPyB1bmRlZmluZWQgOiBpdGVtLmxhYmVsfQogICAgICAgICAgICAgICAgICBh"
        "cmlhLWN1cnJlbnQ9e2FjdGl2ZSA/ICJwYWdlIiA6IHVuZGVmaW5lZH0KICAgICAgICAgICAgICAgID4KICAgICAgICAgICAg"
        "ICAgICAgPHNwYW4gY2xhc3NOYW1lPSJpY29uIj57aXRlbS5pY29ufTwvc3Bhbj4KICAgICAgICAgICAgICAgICAge29wZW4g"
        "JiYgPHNwYW4gY2xhc3NOYW1lPSJsYWJlbCI+e2l0ZW0ubGFiZWx9PC9zcGFuPn0KICAgICAgICAgICAgICAgIDwvYnV0dG9u"
        "PgogICAgICAgICAgICAgICk7CiAgICAgICAgICAgIH0pfQogICAgICAgICAgPC9kaXY+CiAgICAgICAgKSl9CiAgICAgIDwv"
        "bmF2PgoKICAgICAgPGRpdiBjbGFzc05hbWU9InNiLWJvdHRvbSI+CiAgICAgICAgPGJ1dHRvbgogICAgICAgICAgdHlwZT0i"
        "YnV0dG9uIgogICAgICAgICAgY2xhc3NOYW1lPSJzYi1tb2RlIgogICAgICAgICAgb25DbGljaz17dG9nZ2xlVGhlbWV9CiAg"
        "ICAgICAgICB0aXRsZT17aXNEYXJrID8gIlN3aXRjaCB0byBsaWdodCBtb2RlIiA6ICJTd2l0Y2ggdG8gZGFyayBtb2RlIn0K"
        "ICAgICAgICAgIGFyaWEtbGFiZWw9e2lzRGFyayA/ICJTd2l0Y2ggdG8gbGlnaHQgbW9kZSIgOiAiU3dpdGNoIHRvIGRhcmsg"
        "bW9kZSJ9CiAgICAgICAgPgogICAgICAgICAgPHNwYW4gY2xhc3NOYW1lPSJpY29uIj57aXNEYXJrID8gPFBpU3VuRHVvdG9u"
        "ZSAvPiA6IDxQaU1vb25EdW90b25lIC8+fTwvc3Bhbj4KICAgICAgICAgIHtvcGVuICYmIDxzcGFuIGNsYXNzTmFtZT0ibGFi"
        "ZWwiPntpc0RhcmsgPyAiTGlnaHQgbW9kZSIgOiAiRGFyayBtb2RlIn08L3NwYW4+fQogICAgICAgICAge29wZW4gJiYgKAog"
        "ICAgICAgICAgICA8c3BhbiBjbGFzc05hbWU9e2BzYi1zd2l0Y2ggJHtpc0RhcmsgPyAib24iIDogIiJ9YH0gYXJpYS1oaWRk"
        "ZW49InRydWUiPgogICAgICAgICAgICAgIDxzcGFuIGNsYXNzTmFtZT0ic2Ita25vYiIgLz4KICAgICAgICAgICAgPC9zcGFu"
        "PgogICAgICAgICAgKX0KICAgICAgICA8L2J1dHRvbj4KICAgICAgPC9kaXY+CiAgICA8L2FzaWRlPgogICk7Cn0KCmV4cG9y"
        "dCBkZWZhdWx0IFNpZGViYXI7Cg=="
    ),
    "src/components/sidebar/sidebar.css": (
        "LyogPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09"
        "PT09PT0KICAgU2lkZWJhciAtIGxpZ2h0IHJhaWwgd2l0aCBhbiBleHBsaWNpdCBvcGVuIC8gY2xvc2UgcGluLgogICBDb2xs"
        "YXBzZWQgNzZweCwgb3BlbiAyNjBweC4gQWxsIGNvbG91ciBjb21lcyBmcm9tIHRva2Vucy5jc3MuCiAgID09PT09PT09PT09"
        "PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09ICovCgouc2lk"
        "ZWJhciB7CiAgcG9zaXRpb246IGZpeGVkOwogIHRvcDogMDsKICBsZWZ0OiAwOwogIHotaW5kZXg6IDEwMDA7CgogIGRpc3Bs"
        "YXk6IGZsZXg7CiAgZmxleC1kaXJlY3Rpb246IGNvbHVtbjsKCiAgd2lkdGg6IDc2cHg7CiAgaGVpZ2h0OiAxMDB2aDsKICBw"
        "YWRkaW5nOiB2YXIoLS1zcGFjZS0zKSB2YXIoLS1zcGFjZS0yKTsKCiAgYmFja2dyb3VuZDogdmFyKC0tc3VyZmFjZSk7CiAg"
        "Ym9yZGVyLXJpZ2h0OiAxcHggc29saWQgdmFyKC0tYm9yZGVyKTsKCiAgb3ZlcmZsb3cteDogaGlkZGVuOwogIG92ZXJmbG93"
        "LXk6IGF1dG87CiAgb3ZlcnNjcm9sbC1iZWhhdmlvcjogY29udGFpbjsKCiAgdHJhbnNpdGlvbjogd2lkdGggMjIwbXMgdmFy"
        "KC0tZWFzZSksCiAgICAgICAgICAgICAgYmFja2dyb3VuZC1jb2xvciB2YXIoLS1kdXJhdGlvbi1iYXNlKSB2YXIoLS1lYXNl"
        "KSwKICAgICAgICAgICAgICBib3JkZXItY29sb3IgdmFyKC0tZHVyYXRpb24tYmFzZSkgdmFyKC0tZWFzZSk7Cn0KCi5zaWRl"
        "YmFyLmV4cGFuZGVkIHsgd2lkdGg6IDI2MHB4OyBwYWRkaW5nOiB2YXIoLS1zcGFjZS0zKTsgfQoKLyogLS0tIEJyYW5kIC0t"
        "LS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSAqLwouc2ItdG9w"
        "IHsKICBkaXNwbGF5OiBmbGV4OwogIGFsaWduLWl0ZW1zOiBjZW50ZXI7CiAganVzdGlmeS1jb250ZW50OiBzcGFjZS1iZXR3"
        "ZWVuOwogIGdhcDogdmFyKC0tc3BhY2UtMik7CiAgbWluLWhlaWdodDogNDhweDsKICBtYXJnaW4tYm90dG9tOiB2YXIoLS1z"
        "cGFjZS00KTsKICBwYWRkaW5nOiAwIHZhcigtLXNwYWNlLTEpOwp9Cgouc2ItYnJhbmQgeyBkaXNwbGF5OiBmbGV4OyBhbGln"
        "bi1pdGVtczogY2VudGVyOyBnYXA6IHZhcigtLXNwYWNlLTMpOyBtaW4td2lkdGg6IDA7IH0KCi5zYi1icmFuZCBpbWcgewog"
        "IHdpZHRoOiAzNHB4OwogIGhlaWdodDogMzRweDsKICBib3JkZXItcmFkaXVzOiB2YXIoLS1yYWRpdXMtbWQpOwogIG9iamVj"
        "dC1maXQ6IGNvbnRhaW47CiAgZmxleC1zaHJpbms6IDA7Cn0KCi5zYi1icmFuZC1uYW1lIHsKICBmb250LXNpemU6IHZhcigt"
        "LXRleHQtYmFzZSk7CiAgZm9udC13ZWlnaHQ6IHZhcigtLXdlaWdodC1ib2xkKTsKICBsZXR0ZXItc3BhY2luZzogMC4wNGVt"
        "OwogIGNvbG9yOiB2YXIoLS10ZXh0KTsKICB3aGl0ZS1zcGFjZTogbm93cmFwOwp9Cgouc2ItcGluIHsKICBkaXNwbGF5OiBn"
        "cmlkOwogIHBsYWNlLWl0ZW1zOiBjZW50ZXI7CiAgd2lkdGg6IDMwcHg7CiAgaGVpZ2h0OiAzMHB4OwogIGZsZXgtc2hyaW5r"
        "OiAwOwogIGJhY2tncm91bmQ6IHRyYW5zcGFyZW50OwogIGJvcmRlcjogbm9uZTsKICBib3JkZXItcmFkaXVzOiB2YXIoLS1y"
        "YWRpdXMtc20pOwogIGNvbG9yOiB2YXIoLS10ZXh0LW11dGVkKTsKICBjdXJzb3I6IHBvaW50ZXI7Cn0KLnNiLXBpbjpob3Zl"
        "ciB7IGJhY2tncm91bmQ6IHZhcigtLXN1cmZhY2Utc3Vua2VuKTsgY29sb3I6IHZhcigtLXRleHQpOyB9Ci5zYi1waW5bYXJp"
        "YS1wcmVzc2VkPSd0cnVlJ10geyBjb2xvcjogdmFyKC0tYnJhbmQtNTAwKTsgfQouc2ItcGluIHN2ZyB7IHdpZHRoOiAxOHB4"
        "OyBoZWlnaHQ6IDE4cHg7IH0KCi8qIC0tLSBHcm91cHMgLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0t"
        "LS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0gKi8KLnNiLW5hdiB7IGZsZXg6IDE7IGRpc3BsYXk6IGZsZXg7IGZsZXgtZGlyZWN0"
        "aW9uOiBjb2x1bW47IGdhcDogdmFyKC0tc3BhY2UtNCk7IH0KCi5zYi1ncm91cCB7IGRpc3BsYXk6IGZsZXg7IGZsZXgtZGly"
        "ZWN0aW9uOiBjb2x1bW47IGdhcDogMnB4OyB9Cgouc2ItaGVhZGluZyB7CiAgcGFkZGluZzogMCB2YXIoLS1zcGFjZS0zKSB2"
        "YXIoLS1zcGFjZS0xKTsKICBjb2xvcjogdmFyKC0tdGV4dC1tdXRlZCk7CiAgZm9udC1zaXplOiB2YXIoLS10ZXh0LXhzKTsK"
        "ICBmb250LXdlaWdodDogdmFyKC0td2VpZ2h0LXNlbWlib2xkKTsKICBsZXR0ZXItc3BhY2luZzogdmFyKC0tdHJhY2tpbmct"
        "d2lkZSk7CiAgdGV4dC10cmFuc2Zvcm06IHVwcGVyY2FzZTsKICB3aGl0ZS1zcGFjZTogbm93cmFwOwp9CgovKiBDb2xsYXBz"
        "ZWQ6IGEgaGFpcmxpbmUgc3RhbmRzIGluIGZvciB0aGUgZ3JvdXAgaGVhZGluZy4gKi8KLnNiLXJ1bGUgewogIGhlaWdodDog"
        "MXB4OwogIG1hcmdpbjogdmFyKC0tc3BhY2UtMikgdmFyKC0tc3BhY2UtMyk7CiAgYmFja2dyb3VuZDogdmFyKC0tYm9yZGVy"
        "KTsKfQoKLyogLS0tIEl0ZW1zIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0t"
        "LS0tLS0tLS0tLSAqLwouc2lkZWJhciAubWVudS1pdGVtIHsKICBkaXNwbGF5OiBmbGV4OwogIGFsaWduLWl0ZW1zOiBjZW50"
        "ZXI7CiAgZ2FwOiB2YXIoLS1zcGFjZS0zKTsKCiAgd2lkdGg6IDEwMCU7CiAgbWluLWhlaWdodDogNDJweDsKICBwYWRkaW5n"
        "OiAwIHZhcigtLXNwYWNlLTMpOwoKICBiYWNrZ3JvdW5kOiB0cmFuc3BhcmVudDsKICBib3JkZXI6IG5vbmU7CiAgYm9yZGVy"
        "LXJhZGl1czogdmFyKC0tcmFkaXVzLW1kKTsKCiAgY29sb3I6IHZhcigtLXRleHQtc2Vjb25kYXJ5KTsKICBmb250LXNpemU6"
        "IHZhcigtLXRleHQtYmFzZSk7CiAgZm9udC13ZWlnaHQ6IHZhcigtLXdlaWdodC1tZWRpdW0pOwogIHRleHQtYWxpZ246IGxl"
        "ZnQ7CiAgd2hpdGUtc3BhY2U6IG5vd3JhcDsKICBjdXJzb3I6IHBvaW50ZXI7CgogIHRyYW5zaXRpb246IGJhY2tncm91bmQt"
        "Y29sb3IgdmFyKC0tZHVyYXRpb24tZmFzdCkgdmFyKC0tZWFzZSksCiAgICAgICAgICAgICAgY29sb3IgdmFyKC0tZHVyYXRp"
        "b24tZmFzdCkgdmFyKC0tZWFzZSk7Cn0KCi5zaWRlYmFyOm5vdCguZXhwYW5kZWQpIC5tZW51LWl0ZW0geyBqdXN0aWZ5LWNv"
        "bnRlbnQ6IGNlbnRlcjsgcGFkZGluZzogMDsgfQoKLnNpZGViYXIgLm1lbnUtaXRlbTpob3ZlciB7IGJhY2tncm91bmQ6IHZh"
        "cigtLXN1cmZhY2Utc3Vua2VuKTsgY29sb3I6IHZhcigtLXRleHQpOyB9Cgouc2lkZWJhciAubWVudS1pdGVtIC5pY29uIHsK"
        "ICBkaXNwbGF5OiBncmlkOwogIHBsYWNlLWl0ZW1zOiBjZW50ZXI7CiAgZmxleC1zaHJpbms6IDA7CiAgY29sb3I6IHZhcigt"
        "LXRleHQtbXV0ZWQpOwogIHRyYW5zaXRpb246IGNvbG9yIHZhcigtLWR1cmF0aW9uLWZhc3QpIHZhcigtLWVhc2UpOwp9Cgou"
        "c2lkZWJhciAubWVudS1pdGVtIC5pY29uIHN2ZyB7IHdpZHRoOiAyMXB4OyBoZWlnaHQ6IDIxcHg7IH0KCi5zaWRlYmFyIC5t"
        "ZW51LWl0ZW06aG92ZXIgLmljb24geyBjb2xvcjogdmFyKC0tdGV4dC1zZWNvbmRhcnkpOyB9CgovKiBBY3RpdmUgLSB0aW50"
        "ZWQgcGlsbCwgYnJhbmQtY29sb3VyZWQgZ2x5cGguICovCi5zaWRlYmFyIC5tZW51LWl0ZW0uYWN0aXZlIHsKICBiYWNrZ3Jv"
        "dW5kOiB2YXIoLS1icmFuZC01MCk7CiAgY29sb3I6IHZhcigtLWJyYW5kLTcwMCk7CiAgZm9udC13ZWlnaHQ6IHZhcigtLXdl"
        "aWdodC1zZW1pYm9sZCk7Cn0KLnNpZGViYXIgLm1lbnUtaXRlbS5hY3RpdmUgLmljb24geyBjb2xvcjogdmFyKC0tYnJhbmQt"
        "NTAwKTsgfQoKW2RhdGEtdGhlbWU9J2RhcmsnXSAuc2lkZWJhciAubWVudS1pdGVtLmFjdGl2ZSB7CiAgYmFja2dyb3VuZDog"
        "dmFyKC0tYnJhbmQtMTAwKTsKICBjb2xvcjogdmFyKC0tYnJhbmQtODAwKTsKfQoKLnNpZGViYXIgLm1lbnUtaXRlbTpmb2N1"
        "cy12aXNpYmxlIHsKICBvdXRsaW5lOiAycHggc29saWQgdmFyKC0tYm9yZGVyLWZvY3VzKTsKICBvdXRsaW5lLW9mZnNldDog"
        "LTJweDsKfQoKLnNpZGViYXIgLmxhYmVsIHsgb3ZlcmZsb3c6IGhpZGRlbjsgdGV4dC1vdmVyZmxvdzogZWxsaXBzaXM7IH0K"
        "Ci8qIC0tLSBEYXJrIG1vZGUgcm93IC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0t"
        "LS0tLS0gKi8KLnNiLWJvdHRvbSB7IG1hcmdpbi10b3A6IHZhcigtLXNwYWNlLTQpOyBwYWRkaW5nLXRvcDogdmFyKC0tc3Bh"
        "Y2UtMyk7IGJvcmRlci10b3A6IDFweCBzb2xpZCB2YXIoLS1ib3JkZXIpOyB9Cgouc2ItbW9kZSB7CiAgZGlzcGxheTogZmxl"
        "eDsKICBhbGlnbi1pdGVtczogY2VudGVyOwogIGdhcDogdmFyKC0tc3BhY2UtMyk7CiAgd2lkdGg6IDEwMCU7CiAgbWluLWhl"
        "aWdodDogNDJweDsKICBwYWRkaW5nOiAwIHZhcigtLXNwYWNlLTMpOwogIGJhY2tncm91bmQ6IHRyYW5zcGFyZW50OwogIGJv"
        "cmRlcjogbm9uZTsKICBib3JkZXItcmFkaXVzOiB2YXIoLS1yYWRpdXMtbWQpOwogIGNvbG9yOiB2YXIoLS10ZXh0LXNlY29u"
        "ZGFyeSk7CiAgZm9udC1zaXplOiB2YXIoLS10ZXh0LWJhc2UpOwogIGZvbnQtd2VpZ2h0OiB2YXIoLS13ZWlnaHQtbWVkaXVt"
        "KTsKICBjdXJzb3I6IHBvaW50ZXI7CiAgd2hpdGUtc3BhY2U6IG5vd3JhcDsKfQoKLnNpZGViYXI6bm90KC5leHBhbmRlZCkg"
        "LnNiLW1vZGUgeyBqdXN0aWZ5LWNvbnRlbnQ6IGNlbnRlcjsgcGFkZGluZzogMDsgfQouc2ItbW9kZTpob3ZlciB7IGJhY2tn"
        "cm91bmQ6IHZhcigtLXN1cmZhY2Utc3Vua2VuKTsgY29sb3I6IHZhcigtLXRleHQpOyB9Ci5zYi1tb2RlIC5pY29uIHsgZGlz"
        "cGxheTogZ3JpZDsgcGxhY2UtaXRlbXM6IGNlbnRlcjsgY29sb3I6IHZhcigtLXRleHQtbXV0ZWQpOyBmbGV4LXNocmluazog"
        "MDsgfQouc2ItbW9kZSAuaWNvbiBzdmcgeyB3aWR0aDogMjFweDsgaGVpZ2h0OiAyMXB4OyB9Ci5zYi1tb2RlIC5sYWJlbCB7"
        "IGZsZXg6IDE7IHRleHQtYWxpZ246IGxlZnQ7IH0KLnNiLW1vZGU6Zm9jdXMtdmlzaWJsZSB7IG91dGxpbmU6IDJweCBzb2xp"
        "ZCB2YXIoLS1ib3JkZXItZm9jdXMpOyBvdXRsaW5lLW9mZnNldDogLTJweDsgfQoKLnNiLXN3aXRjaCB7CiAgcG9zaXRpb246"
        "IHJlbGF0aXZlOwogIHdpZHRoOiAzNHB4OwogIGhlaWdodDogMjBweDsKICBmbGV4LXNocmluazogMDsKICBiYWNrZ3JvdW5k"
        "OiB2YXIoLS1ib3JkZXItc3Ryb25nKTsKICBib3JkZXItcmFkaXVzOiB2YXIoLS1yYWRpdXMtZnVsbCk7CiAgdHJhbnNpdGlv"
        "bjogYmFja2dyb3VuZC1jb2xvciB2YXIoLS1kdXJhdGlvbi1mYXN0KSB2YXIoLS1lYXNlKTsKfQouc2Itc3dpdGNoLm9uIHsg"
        "YmFja2dyb3VuZDogdmFyKC0tYnJhbmQtNTAwKTsgfQoKLnNiLWtub2IgewogIHBvc2l0aW9uOiBhYnNvbHV0ZTsKICB0b3A6"
        "IDNweDsKICBsZWZ0OiAzcHg7CiAgd2lkdGg6IDE0cHg7CiAgaGVpZ2h0OiAxNHB4OwogIGJhY2tncm91bmQ6ICNmZmY7CiAg"
        "Ym9yZGVyLXJhZGl1czogdmFyKC0tcmFkaXVzLWZ1bGwpOwogIHRyYW5zaXRpb246IHRyYW5zZm9ybSB2YXIoLS1kdXJhdGlv"
        "bi1mYXN0KSB2YXIoLS1lYXNlKTsKfQouc2Itc3dpdGNoLm9uIC5zYi1rbm9iIHsgdHJhbnNmb3JtOiB0cmFuc2xhdGVYKDE0"
        "cHgpOyB9CgovKiAtLS0gU2Nyb2xsYmFyIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0t"
        "LS0tLS0tLS0tLS0tICovCi5zaWRlYmFyOjotd2Via2l0LXNjcm9sbGJhciB7IHdpZHRoOiA2cHg7IH0KLnNpZGViYXI6Oi13"
        "ZWJraXQtc2Nyb2xsYmFyLXRodW1iIHsgYmFja2dyb3VuZDogdmFyKC0tYm9yZGVyLXN0cm9uZyk7IGJvcmRlci1yYWRpdXM6"
        "IHZhcigtLXJhZGl1cy1mdWxsKTsgfQoKLyogLS0tIFNtYWxsIHNjcmVlbnMgLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0t"
        "LS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSAqLwpAbWVkaWEgKG1heC13aWR0aDogNzY4cHgpIHsKICAuc2lkZWJhciB7"
        "IHdpZHRoOiA2NHB4OyB9CiAgLnNpZGViYXIuZXhwYW5kZWQgeyB3aWR0aDogMjQwcHg7IGJveC1zaGFkb3c6IHZhcigtLXNo"
        "YWRvdy1sZyk7IH0KfQoKQG1lZGlhIChwcmVmZXJzLXJlZHVjZWQtbW90aW9uOiByZWR1Y2UpIHsKICAuc2lkZWJhciwgLnNi"
        "LWtub2IsIC5zYi1zd2l0Y2ggeyB0cmFuc2l0aW9uOiBub25lOyB9Cn0K"
    ),
    "src/components/ui/index.jsx": (
        "LyoqDQogKiBTaGFyZWQgVUkgcHJpbWl0aXZlcyBmb3IgdGhlIExhIEVzZmVyYSBIUk1TLg0KICoNCiAqICAgaW1wb3J0IHsg"
        "QnV0dG9uLCBDYXJkLCBTdGF0LCBGaWVsZCwgSW5wdXQsIEJhZGdlLCBUYWJsZSB9IGZyb20gIi4uLy4uL2NvbXBvbmVudHMv"
        "dWkiOw0KICoNCiAqIEV2ZXJ5IGNvbXBvbmVudCByZWFkcyBpdHMgY29sb3VycyBmcm9tIHRva2Vucy5jc3MsIHNvIGFsbCBv"
        "ZiBpdCByZXNwb25kcw0KICogdG8gdGhlIGxpZ2h0L2Rhcmsgc3dpdGNoIHdpdGggbm8gZXh0cmEgd29yayBpbiB0aGUgcGFn"
        "ZS4NCiAqLw0KaW1wb3J0ICIuL3VpLmNzcyI7DQppbXBvcnQgeyB1c2VUaGVtZSB9IGZyb20gIi4uLy4uL3RoZW1lL1RoZW1l"
        "UHJvdmlkZXIiOw0KDQovKiAtLS0gQnV0dG9uIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0t"
        "LS0tLS0tLS0tLS0tLS0tLS0tICovDQpleHBvcnQgZnVuY3Rpb24gQnV0dG9uKHsNCiAgY2hpbGRyZW4sDQogIHZhcmlhbnQg"
        "PSAicHJpbWFyeSIsDQogIHNpemUgPSAibWQiLA0KICBibG9jayA9IGZhbHNlLA0KICBsb2FkaW5nID0gZmFsc2UsDQogIGRp"
        "c2FibGVkID0gZmFsc2UsDQogIHR5cGUgPSAiYnV0dG9uIiwNCiAgY2xhc3NOYW1lID0gIiIsDQogIC4uLnJlc3QNCn0pIHsN"
        "CiAgY29uc3QgY2xhc3NlcyA9IFsNCiAgICAidWktYnRuIiwNCiAgICBgdWktYnRuLS0ke3ZhcmlhbnR9YCwNCiAgICBgdWkt"
        "YnRuLS0ke3NpemV9YCwNCiAgICBibG9jayA/ICJ1aS1idG4tLWJsb2NrIiA6ICIiLA0KICAgIGNsYXNzTmFtZSwNCiAgXQ0K"
        "ICAgIC5maWx0ZXIoQm9vbGVhbikNCiAgICAuam9pbigiICIpOw0KDQogIHJldHVybiAoDQogICAgPGJ1dHRvbiB0eXBlPXt0"
        "eXBlfSBjbGFzc05hbWU9e2NsYXNzZXN9IGRpc2FibGVkPXtkaXNhYmxlZCB8fCBsb2FkaW5nfSB7Li4ucmVzdH0+DQogICAg"
        "ICB7bG9hZGluZyAmJiA8c3BhbiBjbGFzc05hbWU9InVpLWJ0bl9fc3Bpbm5lciIgYXJpYS1oaWRkZW49InRydWUiIC8+fQ0K"
        "ICAgICAge2NoaWxkcmVufQ0KICAgIDwvYnV0dG9uPg0KICApOw0KfQ0KDQovKiAtLS0gQ2FyZCAtLS0tLS0tLS0tLS0tLS0t"
        "LS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tICovDQpleHBvcnQgZnVuY3Rpb24gQ2Fy"
        "ZCh7IGNoaWxkcmVuLCBwYWRkZWQgPSBmYWxzZSwgaW50ZXJhY3RpdmUgPSBmYWxzZSwgY2xhc3NOYW1lID0gIiIsIC4uLnJl"
        "c3QgfSkgew0KICBjb25zdCBjbGFzc2VzID0gWw0KICAgICJ1aS1jYXJkIiwNCiAgICBwYWRkZWQgPyAidWktY2FyZC0tcGFk"
        "IiA6ICIiLA0KICAgIGludGVyYWN0aXZlID8gInVpLWNhcmQtLWludGVyYWN0aXZlIiA6ICIiLA0KICAgIGNsYXNzTmFtZSwN"
        "CiAgXQ0KICAgIC5maWx0ZXIoQm9vbGVhbikNCiAgICAuam9pbigiICIpOw0KDQogIHJldHVybiAoDQogICAgPGRpdiBjbGFz"
        "c05hbWU9e2NsYXNzZXN9IHsuLi5yZXN0fT4NCiAgICAgIHtjaGlsZHJlbn0NCiAgICA8L2Rpdj4NCiAgKTsNCn0NCg0KZXhw"
        "b3J0IGZ1bmN0aW9uIENhcmRIZWFkZXIoeyB0aXRsZSwgc3VidGl0bGUsIGFjdGlvbiB9KSB7DQogIHJldHVybiAoDQogICAg"
        "PGRpdiBjbGFzc05hbWU9InVpLWNhcmRfX2hlYWRlciI+DQogICAgICA8ZGl2Pg0KICAgICAgICA8ZGl2IGNsYXNzTmFtZT0i"
        "dWktY2FyZF9fdGl0bGUiPnt0aXRsZX08L2Rpdj4NCiAgICAgICAge3N1YnRpdGxlICYmIDxkaXYgY2xhc3NOYW1lPSJ1aS1j"
        "YXJkX19zdWJ0aXRsZSI+e3N1YnRpdGxlfTwvZGl2Pn0NCiAgICAgIDwvZGl2Pg0KICAgICAge2FjdGlvbn0NCiAgICA8L2Rp"
        "dj4NCiAgKTsNCn0NCg0KZXhwb3J0IGZ1bmN0aW9uIENhcmRCb2R5KHsgY2hpbGRyZW4sIGNsYXNzTmFtZSA9ICIiIH0pIHsN"
        "CiAgcmV0dXJuIDxkaXYgY2xhc3NOYW1lPXtgdWktY2FyZF9fYm9keSAke2NsYXNzTmFtZX1gLnRyaW0oKX0+e2NoaWxkcmVu"
        "fTwvZGl2PjsNCn0NCg0KLyogLS0tIFN0YXQgLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0t"
        "LS0tLS0tLS0tLS0tLS0tLS0tLSAqLw0KZXhwb3J0IGZ1bmN0aW9uIFN0YXQoeyBsYWJlbCwgdmFsdWUsIGhpbnQgfSkgew0K"
        "ICBjb25zdCBpc0VtcHR5ID0gdmFsdWUgPT09IG51bGwgfHwgdmFsdWUgPT09IHVuZGVmaW5lZCB8fCB2YWx1ZSA9PT0gIiI7"
        "DQoNCiAgcmV0dXJuICgNCiAgICA8Q2FyZD4NCiAgICAgIDxkaXYgY2xhc3NOYW1lPSJ1aS1zdGF0Ij4NCiAgICAgICAgPHNw"
        "YW4gY2xhc3NOYW1lPSJ1aS1zdGF0X19sYWJlbCI+e2xhYmVsfTwvc3Bhbj4NCiAgICAgICAgPHNwYW4gY2xhc3NOYW1lPXtg"
        "dWktc3RhdF9fdmFsdWUgJHtpc0VtcHR5ID8gInVpLXN0YXRfX3ZhbHVlLS1lbXB0eSIgOiAiIn1gLnRyaW0oKX0+DQogICAg"
        "ICAgICAge2lzRW1wdHkgPyAi4oCUIiA6IHZhbHVlfQ0KICAgICAgICA8L3NwYW4+DQogICAgICAgIHtoaW50ICYmIDxzcGFu"
        "IGNsYXNzTmFtZT0idWktc3RhdF9faGludCI+e2hpbnR9PC9zcGFuPn0NCiAgICAgIDwvZGl2Pg0KICAgIDwvQ2FyZD4NCiAg"
        "KTsNCn0NCg0KLyogLS0tIEZvcm0gZmllbGRzIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0t"
        "LS0tLS0tLS0tLS0tLSAqLw0KZXhwb3J0IGZ1bmN0aW9uIEZpZWxkKHsgbGFiZWwsIGh0bWxGb3IsIHJlcXVpcmVkID0gZmFs"
        "c2UsIGVycm9yLCBoaW50LCBjaGlsZHJlbiB9KSB7DQogIHJldHVybiAoDQogICAgPGRpdiBjbGFzc05hbWU9InVpLWZpZWxk"
        "Ij4NCiAgICAgIHtsYWJlbCAmJiAoDQogICAgICAgIDxsYWJlbCBjbGFzc05hbWU9InVpLWZpZWxkX19sYWJlbCIgaHRtbEZv"
        "cj17aHRtbEZvcn0+DQogICAgICAgICAge2xhYmVsfQ0KICAgICAgICAgIHtyZXF1aXJlZCAmJiA8c3BhbiBjbGFzc05hbWU9"
        "InVpLWZpZWxkX19yZXF1aXJlZCIgYXJpYS1oaWRkZW49InRydWUiPio8L3NwYW4+fQ0KICAgICAgICA8L2xhYmVsPg0KICAg"
        "ICAgKX0NCiAgICAgIHtjaGlsZHJlbn0NCiAgICAgIHtlcnJvciAmJiA8c3BhbiBjbGFzc05hbWU9InVpLWZpZWxkX19lcnJv"
        "ciIgcm9sZT0iYWxlcnQiPntlcnJvcn08L3NwYW4+fQ0KICAgICAgeyFlcnJvciAmJiBoaW50ICYmIDxzcGFuIGNsYXNzTmFt"
        "ZT0idWktZmllbGRfX2hpbnQiPntoaW50fTwvc3Bhbj59DQogICAgPC9kaXY+DQogICk7DQp9DQoNCmV4cG9ydCBmdW5jdGlv"
        "biBJbnB1dCh7IGludmFsaWQgPSBmYWxzZSwgY2xhc3NOYW1lID0gIiIsIC4uLnJlc3QgfSkgew0KICByZXR1cm4gKA0KICAg"
        "IDxpbnB1dA0KICAgICAgY2xhc3NOYW1lPXtgdWktaW5wdXQgJHtjbGFzc05hbWV9YC50cmltKCl9DQogICAgICBhcmlhLWlu"
        "dmFsaWQ9e2ludmFsaWQgfHwgdW5kZWZpbmVkfQ0KICAgICAgey4uLnJlc3R9DQogICAgLz4NCiAgKTsNCn0NCg0KZXhwb3J0"
        "IGZ1bmN0aW9uIFRleHRhcmVhKHsgaW52YWxpZCA9IGZhbHNlLCBjbGFzc05hbWUgPSAiIiwgLi4ucmVzdCB9KSB7DQogIHJl"
        "dHVybiAoDQogICAgPHRleHRhcmVhDQogICAgICBjbGFzc05hbWU9e2B1aS10ZXh0YXJlYSAke2NsYXNzTmFtZX1gLnRyaW0o"
        "KX0NCiAgICAgIGFyaWEtaW52YWxpZD17aW52YWxpZCB8fCB1bmRlZmluZWR9DQogICAgICB7Li4ucmVzdH0NCiAgICAvPg0K"
        "ICApOw0KfQ0KDQpleHBvcnQgZnVuY3Rpb24gU2VsZWN0KHsgaW52YWxpZCA9IGZhbHNlLCBjbGFzc05hbWUgPSAiIiwgY2hp"
        "bGRyZW4sIC4uLnJlc3QgfSkgew0KICByZXR1cm4gKA0KICAgIDxzZWxlY3QNCiAgICAgIGNsYXNzTmFtZT17YHVpLXNlbGVj"
        "dCAke2NsYXNzTmFtZX1gLnRyaW0oKX0NCiAgICAgIGFyaWEtaW52YWxpZD17aW52YWxpZCB8fCB1bmRlZmluZWR9DQogICAg"
        "ICB7Li4ucmVzdH0NCiAgICA+DQogICAgICB7Y2hpbGRyZW59DQogICAgPC9zZWxlY3Q+DQogICk7DQp9DQoNCi8qIC0tLSBT"
        "dGF0dXMgLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0gKi8N"
        "Ci8qKiBNYXBzIHdoYXRldmVyIHRoZSBBUEkgcmV0dXJucyBvbnRvIHRoZSBhcHAncyBmaXZlIGtub3duIHN0YXRlcy4gKi8N"
        "CmV4cG9ydCBmdW5jdGlvbiBub3JtYWxpc2VTdGF0dXMocmF3KSB7DQogIGNvbnN0IHZhbHVlID0gU3RyaW5nKHJhdyB8fCAi"
        "IikudG9Mb3dlckNhc2UoKS50cmltKCk7DQogIGlmIChbInByZXNlbnQiLCAicCIsICJpbiIsICJjaGVja2VkIGluIiwgImFj"
        "dGl2ZSJdLmluY2x1ZGVzKHZhbHVlKSkgcmV0dXJuICJwcmVzZW50IjsNCiAgaWYgKFsibGF0ZSIsICJsIiwgImRlbGF5ZWQi"
        "XS5pbmNsdWRlcyh2YWx1ZSkpIHJldHVybiAibGF0ZSI7DQogIGlmIChbImFic2VudCIsICJhIiwgIm1pc3NpbmciXS5pbmNs"
        "dWRlcyh2YWx1ZSkpIHJldHVybiAiYWJzZW50IjsNCiAgaWYgKFsibGVhdmUiLCAib24gbGVhdmUiLCAiaG9saWRheSIsICJv"
        "ZmYiXS5pbmNsdWRlcyh2YWx1ZSkpIHJldHVybiAibGVhdmUiOw0KICBpZiAoWyJwZW5kaW5nIiwgImF3YWl0aW5nIiwgInJl"
        "cXVlc3RlZCIsICJzdWJtaXR0ZWQiXS5pbmNsdWRlcyh2YWx1ZSkpIHJldHVybiAicGVuZGluZyI7DQogIHJldHVybiAibmV1"
        "dHJhbCI7DQp9DQoNCmV4cG9ydCBmdW5jdGlvbiBCYWRnZSh7IHN0YXR1cywgY2hpbGRyZW4sIGNsYXNzTmFtZSA9ICIiIH0p"
        "IHsNCiAgY29uc3QgdG9uZSA9IG5vcm1hbGlzZVN0YXR1cyhzdGF0dXMgPz8gY2hpbGRyZW4pOw0KICByZXR1cm4gKA0KICAg"
        "IDxzcGFuIGNsYXNzTmFtZT17YHVpLWJhZGdlIHVpLWJhZGdlLS0ke3RvbmV9ICR7Y2xhc3NOYW1lfWAudHJpbSgpfT4NCiAg"
        "ICAgIDxzcGFuIGNsYXNzTmFtZT17YHVpLWRvdCB1aS1kb3QtLSR7dG9uZX1gfSBhcmlhLWhpZGRlbj0idHJ1ZSIgLz4NCiAg"
        "ICAgIHtjaGlsZHJlbn0NCiAgICA8L3NwYW4+DQogICk7DQp9DQoNCmV4cG9ydCBmdW5jdGlvbiBTdGF0dXNEb3QoeyBzdGF0"
        "dXMgfSkgew0KICByZXR1cm4gPHNwYW4gY2xhc3NOYW1lPXtgdWktZG90IHVpLWRvdC0tJHtub3JtYWxpc2VTdGF0dXMoc3Rh"
        "dHVzKX1gfSBhcmlhLWhpZGRlbj0idHJ1ZSIgLz47DQp9DQoNCi8qIC0tLSBUYWJsZSAtLS0tLS0tLS0tLS0tLS0tLS0tLS0t"
        "LS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0gKi8NCmV4cG9ydCBmdW5jdGlvbiBUYWJsZSh7IGNo"
        "aWxkcmVuLCBjbGFzc05hbWUgPSAiIiB9KSB7DQogIHJldHVybiAoDQogICAgPGRpdiBjbGFzc05hbWU9InVpLXRhYmxlLXdy"
        "YXAiPg0KICAgICAgPHRhYmxlIGNsYXNzTmFtZT17YHVpLXRhYmxlICR7Y2xhc3NOYW1lfWAudHJpbSgpfT57Y2hpbGRyZW59"
        "PC90YWJsZT4NCiAgICA8L2Rpdj4NCiAgKTsNCn0NCg0KLyogLS0tIFN0YXRlcyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0t"
        "LS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSAqLw0KZXhwb3J0IGZ1bmN0aW9uIEVtcHR5U3RhdGUoeyBp"
        "Y29uLCB0aXRsZSwgY2hpbGRyZW4sIGFjdGlvbiB9KSB7DQogIHJldHVybiAoDQogICAgPGRpdiBjbGFzc05hbWU9InVpLWVt"
        "cHR5Ij4NCiAgICAgIHtpY29uICYmIDxkaXYgY2xhc3NOYW1lPSJ1aS1lbXB0eV9faWNvbiIgYXJpYS1oaWRkZW49InRydWUi"
        "PntpY29ufTwvZGl2Pn0NCiAgICAgIDxkaXYgY2xhc3NOYW1lPSJ1aS1lbXB0eV9fdGl0bGUiPnt0aXRsZX08L2Rpdj4NCiAg"
        "ICAgIHtjaGlsZHJlbiAmJiA8cCBjbGFzc05hbWU9InVpLWVtcHR5X19ib2R5Ij57Y2hpbGRyZW59PC9wPn0NCiAgICAgIHth"
        "Y3Rpb259DQogICAgPC9kaXY+DQogICk7DQp9DQoNCmV4cG9ydCBmdW5jdGlvbiBTcGlubmVyKHsgc2l6ZSA9ICJtZCIsIGxh"
        "YmVsIH0pIHsNCiAgaWYgKCFsYWJlbCkgcmV0dXJuIDxzcGFuIGNsYXNzTmFtZT17YHVpLXNwaW5uZXIgdWktc3Bpbm5lci0t"
        "JHtzaXplfWB9IHJvbGU9InN0YXR1cyIgYXJpYS1sYWJlbD0iTG9hZGluZyIgLz47DQoNCiAgcmV0dXJuICgNCiAgICA8ZGl2"
        "IGNsYXNzTmFtZT0idWktc3Bpbm5lci13cmFwIiByb2xlPSJzdGF0dXMiPg0KICAgICAgPHNwYW4gY2xhc3NOYW1lPXtgdWkt"
        "c3Bpbm5lciB1aS1zcGlubmVyLS0ke3NpemV9YH0gLz4NCiAgICAgIDxzcGFuPntsYWJlbH08L3NwYW4+DQogICAgPC9kaXY+"
        "DQogICk7DQp9DQoNCmV4cG9ydCBmdW5jdGlvbiBTa2VsZXRvbih7IHdpZHRoID0gIjEwMCUiLCBoZWlnaHQgPSAxNiwgcmFk"
        "aXVzLCBzdHlsZSA9IHt9IH0pIHsNCiAgcmV0dXJuICgNCiAgICA8c3Bhbg0KICAgICAgY2xhc3NOYW1lPSJ1aS1za2VsZXRv"
        "biINCiAgICAgIHN0eWxlPXt7IGRpc3BsYXk6ICJibG9jayIsIHdpZHRoLCBoZWlnaHQsIGJvcmRlclJhZGl1czogcmFkaXVz"
        "LCAuLi5zdHlsZSB9fQ0KICAgICAgYXJpYS1oaWRkZW49InRydWUiDQogICAgLz4NCiAgKTsNCn0NCg0KLyogLS0tIFRoZW1l"
        "IHRvZ2dsZSAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSAqLw0KZXhw"
        "b3J0IGZ1bmN0aW9uIFRoZW1lVG9nZ2xlKCkgew0KICBjb25zdCB7IHRoZW1lLCB0b2dnbGVUaGVtZSB9ID0gdXNlVGhlbWUo"
        "KTsNCiAgY29uc3QgaXNEYXJrID0gdGhlbWUgPT09ICJkYXJrIjsNCg0KICByZXR1cm4gKA0KICAgIDxidXR0b24NCiAgICAg"
        "IHR5cGU9ImJ1dHRvbiINCiAgICAgIGNsYXNzTmFtZT0idWktdGhlbWUtdG9nZ2xlIg0KICAgICAgb25DbGljaz17dG9nZ2xl"
        "VGhlbWV9DQogICAgICB0aXRsZT17aXNEYXJrID8gIlN3aXRjaCB0byBsaWdodCBtb2RlIiA6ICJTd2l0Y2ggdG8gZGFyayBt"
        "b2RlIn0NCiAgICAgIGFyaWEtbGFiZWw9e2lzRGFyayA/ICJTd2l0Y2ggdG8gbGlnaHQgbW9kZSIgOiAiU3dpdGNoIHRvIGRh"
        "cmsgbW9kZSJ9DQogICAgPg0KICAgICAge2lzRGFyayA/ICgNCiAgICAgICAgPHN2ZyB3aWR0aD0iMTgiIGhlaWdodD0iMTgi"
        "IHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJjdXJyZW50Q29sb3IiIHN0cm9rZVdpZHRoPSIyIiBz"
        "dHJva2VMaW5lY2FwPSJyb3VuZCI+DQogICAgICAgICAgPGNpcmNsZSBjeD0iMTIiIGN5PSIxMiIgcj0iNCIgLz4NCiAgICAg"
        "ICAgICA8cGF0aCBkPSJNMTIgMnYyTTEyIDIwdjJNNC45IDQuOWwxLjQgMS40TTE3LjcgMTcuN2wxLjQgMS40TTIgMTJoMk0y"
        "MCAxMmgyTTQuOSAxOS4xbDEuNC0xLjRNMTcuNyA2LjNsMS40LTEuNCIgLz4NCiAgICAgICAgPC9zdmc+DQogICAgICApIDog"
        "KA0KICAgICAgICA8c3ZnIHdpZHRoPSIxOCIgaGVpZ2h0PSIxOCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBz"
        "dHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlV2lkdGg9IjIiIHN0cm9rZUxpbmVjYXA9InJvdW5kIiBzdHJva2VMaW5lam9p"
        "bj0icm91bmQiPg0KICAgICAgICAgIDxwYXRoIGQ9Ik0yMSAxMi44QTkgOSAwIDEgMSAxMS4yIDNhNyA3IDAgMCAwIDkuOCA5"
        "Ljh6IiAvPg0KICAgICAgICA8L3N2Zz4NCiAgICAgICl9DQogICAgPC9idXR0b24+DQogICk7DQp9DQo="
    ),
    "src/components/ui/ui.css": (
        "LyogPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09"
        "PT09PT0NCiAgIFVJIHByaW1pdGl2ZXMuIEV2ZXJ5IHJ1bGUgaGVyZSByZWFkcyBmcm9tIHRva2Vucy5jc3MsIHNvIGFsbCBv"
        "ZiBpdA0KICAgdGhlbWVzIGF1dG9tYXRpY2FsbHkuIE5vdGhpbmcgaW4gdGhpcyBmaWxlIGNvbnRhaW5zIGEgcmF3IGNvbG91"
        "ci4NCiAgID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09"
        "PT09PT09PT09ICovDQoNCi8qIC0tLSBCdXR0b24gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0t"
        "LS0tLS0tLS0tLS0tLS0tLS0tLS0gKi8NCi51aS1idG4gew0KICBkaXNwbGF5OiBpbmxpbmUtZmxleDsNCiAgYWxpZ24taXRl"
        "bXM6IGNlbnRlcjsNCiAganVzdGlmeS1jb250ZW50OiBjZW50ZXI7DQogIGdhcDogdmFyKC0tc3BhY2UtMik7DQogIGJvcmRl"
        "cjogMXB4IHNvbGlkIHRyYW5zcGFyZW50Ow0KICBib3JkZXItcmFkaXVzOiB2YXIoLS1yYWRpdXMtbWQpOw0KICBmb250LWZh"
        "bWlseTogdmFyKC0tZm9udC1zYW5zKTsNCiAgZm9udC1zaXplOiB2YXIoLS10ZXh0LWJhc2UpOw0KICBmb250LXdlaWdodDog"
        "dmFyKC0td2VpZ2h0LW1lZGl1bSk7DQogIGxpbmUtaGVpZ2h0OiAxOw0KICB3aGl0ZS1zcGFjZTogbm93cmFwOw0KICBjdXJz"
        "b3I6IHBvaW50ZXI7DQogIHRyYW5zaXRpb246IGJhY2tncm91bmQtY29sb3IgdmFyKC0tZHVyYXRpb24tZmFzdCkgdmFyKC0t"
        "ZWFzZSksDQogICAgICAgICAgICAgIGJvcmRlci1jb2xvciB2YXIoLS1kdXJhdGlvbi1mYXN0KSB2YXIoLS1lYXNlKSwNCiAg"
        "ICAgICAgICAgICAgY29sb3IgdmFyKC0tZHVyYXRpb24tZmFzdCkgdmFyKC0tZWFzZSksDQogICAgICAgICAgICAgIGJveC1z"
        "aGFkb3cgdmFyKC0tZHVyYXRpb24tZmFzdCkgdmFyKC0tZWFzZSk7DQp9DQoNCi51aS1idG46Zm9jdXMtdmlzaWJsZSB7IGJv"
        "eC1zaGFkb3c6IHZhcigtLXJpbmcpOyBvdXRsaW5lOiBub25lOyB9DQoNCi51aS1idG46ZGlzYWJsZWQsDQoudWktYnRuW2Fy"
        "aWEtZGlzYWJsZWQ9J3RydWUnXSB7DQogIG9wYWNpdHk6IDAuNTsNCiAgY3Vyc29yOiBub3QtYWxsb3dlZDsNCiAgcG9pbnRl"
        "ci1ldmVudHM6IG5vbmU7DQp9DQoNCi8qIHNpemVzICovDQoudWktYnRuLS1zbSB7IGhlaWdodDogMzJweDsgcGFkZGluZzog"
        "MCB2YXIoLS1zcGFjZS0zKTsgZm9udC1zaXplOiB2YXIoLS10ZXh0LXNtKTsgfQ0KLnVpLWJ0bi0tbWQgeyBoZWlnaHQ6IDQw"
        "cHg7IHBhZGRpbmc6IDAgdmFyKC0tc3BhY2UtNCk7IH0NCi51aS1idG4tLWxnIHsgaGVpZ2h0OiA0OHB4OyBwYWRkaW5nOiAw"
        "IHZhcigtLXNwYWNlLTYpOyBmb250LXNpemU6IHZhcigtLXRleHQtbWQpOyB9DQoNCi8qIHZhcmlhbnRzICovDQoudWktYnRu"
        "LS1wcmltYXJ5IHsNCiAgYmFja2dyb3VuZDogdmFyKC0tYnJhbmQtNTAwKTsNCiAgY29sb3I6IHZhcigtLXRleHQtb24tYnJh"
        "bmQpOw0KICBib3gtc2hhZG93OiB2YXIoLS1zaGFkb3ctc20pOw0KfQ0KLnVpLWJ0bi0tcHJpbWFyeTpob3ZlciB7IGJhY2tn"
        "cm91bmQ6IHZhcigtLWJyYW5kLTYwMCk7IH0NCi51aS1idG4tLXByaW1hcnk6YWN0aXZlIHsgYmFja2dyb3VuZDogdmFyKC0t"
        "YnJhbmQtNzAwKTsgfQ0KDQoudWktYnRuLS1zZWNvbmRhcnkgew0KICBiYWNrZ3JvdW5kOiB2YXIoLS1zdXJmYWNlKTsNCiAg"
        "Ym9yZGVyLWNvbG9yOiB2YXIoLS1ib3JkZXItc3Ryb25nKTsNCiAgY29sb3I6IHZhcigtLXRleHQpOw0KfQ0KLnVpLWJ0bi0t"
        "c2Vjb25kYXJ5OmhvdmVyIHsgYmFja2dyb3VuZDogdmFyKC0tc3VyZmFjZS1ob3Zlcik7IGJvcmRlci1jb2xvcjogdmFyKC0t"
        "dGV4dC1tdXRlZCk7IH0NCg0KLnVpLWJ0bi0tZ2hvc3QgeyBiYWNrZ3JvdW5kOiB0cmFuc3BhcmVudDsgY29sb3I6IHZhcigt"
        "LXRleHQtc2Vjb25kYXJ5KTsgfQ0KLnVpLWJ0bi0tZ2hvc3Q6aG92ZXIgeyBiYWNrZ3JvdW5kOiB2YXIoLS1zdXJmYWNlLXN1"
        "bmtlbik7IGNvbG9yOiB2YXIoLS10ZXh0KTsgfQ0KDQoudWktYnRuLS1kYW5nZXIgeyBiYWNrZ3JvdW5kOiB2YXIoLS1zdGF0"
        "ZS1hYnNlbnQpOyBjb2xvcjogI2ZmZjsgfQ0KLnVpLWJ0bi0tZGFuZ2VyOmhvdmVyIHsgZmlsdGVyOiBicmlnaHRuZXNzKDAu"
        "OTMpOyB9DQoNCi51aS1idG4tLWJsb2NrIHsgd2lkdGg6IDEwMCU7IH0NCg0KLnVpLWJ0bl9fc3Bpbm5lciB7DQogIHdpZHRo"
        "OiAxNXB4OyBoZWlnaHQ6IDE1cHg7DQogIGJvcmRlcjogMnB4IHNvbGlkIGN1cnJlbnRDb2xvcjsNCiAgYm9yZGVyLXJpZ2h0"
        "LWNvbG9yOiB0cmFuc3BhcmVudDsNCiAgYm9yZGVyLXJhZGl1czogdmFyKC0tcmFkaXVzLWZ1bGwpOw0KICBhbmltYXRpb246"
        "IHVpLXNwaW4gMC42cyBsaW5lYXIgaW5maW5pdGU7DQp9DQoNCkBrZXlmcmFtZXMgdWktc3BpbiB7IHRvIHsgdHJhbnNmb3Jt"
        "OiByb3RhdGUoMzYwZGVnKTsgfSB9DQoNCi8qIC0tLSBDYXJkIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0t"
        "LS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0gKi8NCi51aS1jYXJkIHsNCiAgYmFja2dyb3VuZDogdmFyKC0tc3VyZmFj"
        "ZSk7DQogIGJvcmRlcjogMXB4IHNvbGlkIHZhcigtLWJvcmRlcik7DQogIGJvcmRlci1yYWRpdXM6IHZhcigtLXJhZGl1cy1s"
        "Zyk7DQogIGJveC1zaGFkb3c6IHZhcigtLXNoYWRvdy1zbSk7DQogIHRyYW5zaXRpb246IGJhY2tncm91bmQtY29sb3IgdmFy"
        "KC0tZHVyYXRpb24tYmFzZSkgdmFyKC0tZWFzZSksDQogICAgICAgICAgICAgIGJvcmRlci1jb2xvciB2YXIoLS1kdXJhdGlv"
        "bi1iYXNlKSB2YXIoLS1lYXNlKTsNCn0NCg0KLnVpLWNhcmQtLWZsdXNoIHsgcGFkZGluZzogMDsgfQ0KLnVpLWNhcmQtLXBh"
        "ZCAgIHsgcGFkZGluZzogdmFyKC0tc3BhY2UtNik7IH0NCg0KLnVpLWNhcmQtLWludGVyYWN0aXZlIHsgY3Vyc29yOiBwb2lu"
        "dGVyOyB9DQoudWktY2FyZC0taW50ZXJhY3RpdmU6aG92ZXIgew0KICBib3JkZXItY29sb3I6IHZhcigtLWJvcmRlci1zdHJv"
        "bmcpOw0KICBib3gtc2hhZG93OiB2YXIoLS1zaGFkb3ctbWQpOw0KICB0cmFuc2Zvcm06IHRyYW5zbGF0ZVkoLTFweCk7DQp9"
        "DQoNCi51aS1jYXJkX19oZWFkZXIgew0KICBkaXNwbGF5OiBmbGV4Ow0KICBhbGlnbi1pdGVtczogY2VudGVyOw0KICBqdXN0"
        "aWZ5LWNvbnRlbnQ6IHNwYWNlLWJldHdlZW47DQogIGdhcDogdmFyKC0tc3BhY2UtNCk7DQogIHBhZGRpbmc6IHZhcigtLXNw"
        "YWNlLTUpIHZhcigtLXNwYWNlLTYpOw0KICBib3JkZXItYm90dG9tOiAxcHggc29saWQgdmFyKC0tYm9yZGVyKTsNCn0NCg0K"
        "LnVpLWNhcmRfX3RpdGxlIHsNCiAgZm9udC1zaXplOiB2YXIoLS10ZXh0LWxnKTsNCiAgZm9udC13ZWlnaHQ6IHZhcigtLXdl"
        "aWdodC1zZW1pYm9sZCk7DQogIGNvbG9yOiB2YXIoLS10ZXh0KTsNCn0NCg0KLnVpLWNhcmRfX3N1YnRpdGxlIHsNCiAgbWFy"
        "Z2luLXRvcDogdmFyKC0tc3BhY2UtMSk7DQogIGZvbnQtc2l6ZTogdmFyKC0tdGV4dC1zbSk7DQogIGNvbG9yOiB2YXIoLS10"
        "ZXh0LW11dGVkKTsNCn0NCg0KLnVpLWNhcmRfX2JvZHkgeyBwYWRkaW5nOiB2YXIoLS1zcGFjZS02KTsgfQ0KDQovKiAtLS0g"
        "U3RhdCAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tICov"
        "DQoudWktc3RhdCB7IGRpc3BsYXk6IGZsZXg7IGZsZXgtZGlyZWN0aW9uOiBjb2x1bW47IGdhcDogdmFyKC0tc3BhY2UtMik7"
        "IHBhZGRpbmc6IHZhcigtLXNwYWNlLTUpOyB9DQoNCi51aS1zdGF0X19sYWJlbCB7DQogIGZvbnQtc2l6ZTogdmFyKC0tdGV4"
        "dC14cyk7DQogIGZvbnQtd2VpZ2h0OiB2YXIoLS13ZWlnaHQtc2VtaWJvbGQpOw0KICBsZXR0ZXItc3BhY2luZzogdmFyKC0t"
        "dHJhY2tpbmctd2lkZSk7DQogIHRleHQtdHJhbnNmb3JtOiB1cHBlcmNhc2U7DQogIGNvbG9yOiB2YXIoLS10ZXh0LW11dGVk"
        "KTsNCn0NCg0KLnVpLXN0YXRfX3ZhbHVlIHsNCiAgZm9udC1zaXplOiB2YXIoLS10ZXh0LTN4bCk7DQogIGZvbnQtd2VpZ2h0"
        "OiB2YXIoLS13ZWlnaHQtYm9sZCk7DQogIGxpbmUtaGVpZ2h0OiB2YXIoLS1sZWFkaW5nLXRpZ2h0KTsNCiAgbGV0dGVyLXNw"
        "YWNpbmc6IHZhcigtLXRyYWNraW5nLXRpZ2h0KTsNCiAgY29sb3I6IHZhcigtLXRleHQpOw0KICBmb250LXZhcmlhbnQtbnVt"
        "ZXJpYzogdGFidWxhci1udW1zOw0KfQ0KDQoudWktc3RhdF9fdmFsdWUtLWVtcHR5IHsgY29sb3I6IHZhcigtLXRleHQtbXV0"
        "ZWQpOyBmb250LXdlaWdodDogdmFyKC0td2VpZ2h0LW5vcm1hbCk7IH0NCi51aS1zdGF0X19oaW50IHsgZm9udC1zaXplOiB2"
        "YXIoLS10ZXh0LXNtKTsgY29sb3I6IHZhcigtLXRleHQtbXV0ZWQpOyB9DQoNCi8qIC0tLSBGaWVsZCAvIElucHV0IC0tLS0t"
        "LS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0gKi8NCi51aS1maWVsZCB7IGRpc3Bs"
        "YXk6IGZsZXg7IGZsZXgtZGlyZWN0aW9uOiBjb2x1bW47IGdhcDogdmFyKC0tc3BhY2UtMik7IH0NCg0KLnVpLWZpZWxkX19s"
        "YWJlbCB7DQogIGZvbnQtc2l6ZTogdmFyKC0tdGV4dC1zbSk7DQogIGZvbnQtd2VpZ2h0OiB2YXIoLS13ZWlnaHQtbWVkaXVt"
        "KTsNCiAgY29sb3I6IHZhcigtLXRleHQtc2Vjb25kYXJ5KTsNCn0NCg0KLnVpLWZpZWxkX19yZXF1aXJlZCB7IGNvbG9yOiB2"
        "YXIoLS1zdGF0ZS1hYnNlbnQpOyBtYXJnaW4tbGVmdDogMnB4OyB9DQoNCi51aS1pbnB1dCwNCi51aS1zZWxlY3QsDQoudWkt"
        "dGV4dGFyZWEgew0KICB3aWR0aDogMTAwJTsNCiAgbWluLWhlaWdodDogNDBweDsNCiAgcGFkZGluZzogdmFyKC0tc3BhY2Ut"
        "MikgdmFyKC0tc3BhY2UtMyk7DQogIGJhY2tncm91bmQ6IHZhcigtLXN1cmZhY2UpOw0KICBib3JkZXI6IDFweCBzb2xpZCB2"
        "YXIoLS1ib3JkZXItc3Ryb25nKTsNCiAgYm9yZGVyLXJhZGl1czogdmFyKC0tcmFkaXVzLW1kKTsNCiAgY29sb3I6IHZhcigt"
        "LXRleHQpOw0KICBmb250LWZhbWlseTogdmFyKC0tZm9udC1zYW5zKTsNCiAgZm9udC1zaXplOiB2YXIoLS10ZXh0LWJhc2Up"
        "Ow0KICB0cmFuc2l0aW9uOiBib3JkZXItY29sb3IgdmFyKC0tZHVyYXRpb24tZmFzdCkgdmFyKC0tZWFzZSksDQogICAgICAg"
        "ICAgICAgIGJveC1zaGFkb3cgdmFyKC0tZHVyYXRpb24tZmFzdCkgdmFyKC0tZWFzZSksDQogICAgICAgICAgICAgIGJhY2tn"
        "cm91bmQtY29sb3IgdmFyKC0tZHVyYXRpb24tYmFzZSkgdmFyKC0tZWFzZSk7DQp9DQoNCi51aS10ZXh0YXJlYSB7IG1pbi1o"
        "ZWlnaHQ6IDk2cHg7IHJlc2l6ZTogdmVydGljYWw7IGxpbmUtaGVpZ2h0OiB2YXIoLS1sZWFkaW5nLXNudWcpOyB9DQoNCi51"
        "aS1pbnB1dDo6cGxhY2Vob2xkZXIsDQoudWktdGV4dGFyZWE6OnBsYWNlaG9sZGVyIHsgY29sb3I6IHZhcigtLXRleHQtbXV0"
        "ZWQpOyB9DQoNCi51aS1pbnB1dDpob3ZlciwNCi51aS1zZWxlY3Q6aG92ZXIsDQoudWktdGV4dGFyZWE6aG92ZXIgeyBib3Jk"
        "ZXItY29sb3I6IHZhcigtLXRleHQtbXV0ZWQpOyB9DQoNCi51aS1pbnB1dDpmb2N1cywNCi51aS1zZWxlY3Q6Zm9jdXMsDQou"
        "dWktdGV4dGFyZWE6Zm9jdXMgew0KICBvdXRsaW5lOiBub25lOw0KICBib3JkZXItY29sb3I6IHZhcigtLWJvcmRlci1mb2N1"
        "cyk7DQogIGJveC1zaGFkb3c6IHZhcigtLXJpbmcpOw0KfQ0KDQoudWktaW5wdXQ6ZGlzYWJsZWQsDQoudWktc2VsZWN0OmRp"
        "c2FibGVkLA0KLnVpLXRleHRhcmVhOmRpc2FibGVkIHsNCiAgYmFja2dyb3VuZDogdmFyKC0tc3VyZmFjZS1zdW5rZW4pOw0K"
        "ICBjb2xvcjogdmFyKC0tdGV4dC1tdXRlZCk7DQogIGN1cnNvcjogbm90LWFsbG93ZWQ7DQp9DQoNCi51aS1pbnB1dFthcmlh"
        "LWludmFsaWQ9J3RydWUnXSwNCi51aS1zZWxlY3RbYXJpYS1pbnZhbGlkPSd0cnVlJ10sDQoudWktdGV4dGFyZWFbYXJpYS1p"
        "bnZhbGlkPSd0cnVlJ10geyBib3JkZXItY29sb3I6IHZhcigtLXN0YXRlLWFic2VudCk7IH0NCg0KLnVpLWlucHV0W2FyaWEt"
        "aW52YWxpZD0ndHJ1ZSddOmZvY3VzLA0KLnVpLXRleHRhcmVhW2FyaWEtaW52YWxpZD0ndHJ1ZSddOmZvY3VzIHsNCiAgYm94"
        "LXNoYWRvdzogMCAwIDAgM3B4IHZhcigtLXN0YXRlLWFic2VudC1iZyk7DQp9DQoNCi8qIE5hdGl2ZSBzZWxlY3QgbmVlZHMg"
        "aXRzIG93biBhcnJvdyBvbmNlIHdlIHN0eWxlIHRoZSBib3guICovDQoudWktc2VsZWN0IHsNCiAgYXBwZWFyYW5jZTogbm9u"
        "ZTsNCiAgcGFkZGluZy1yaWdodDogdmFyKC0tc3BhY2UtOCk7DQogIGJhY2tncm91bmQtaW1hZ2U6IGxpbmVhci1ncmFkaWVu"
        "dCg0NWRlZywgdHJhbnNwYXJlbnQgNTAlLCBjdXJyZW50Q29sb3IgNTAlKSwNCiAgICAgICAgICAgICAgICAgICAgbGluZWFy"
        "LWdyYWRpZW50KDEzNWRlZywgY3VycmVudENvbG9yIDUwJSwgdHJhbnNwYXJlbnQgNTAlKTsNCiAgYmFja2dyb3VuZC1wb3Np"
        "dGlvbjogY2FsYygxMDAlIC0gMThweCkgMTdweCwgY2FsYygxMDAlIC0gMTNweCkgMTdweDsNCiAgYmFja2dyb3VuZC1zaXpl"
        "OiA1cHggNXB4LCA1cHggNXB4Ow0KICBiYWNrZ3JvdW5kLXJlcGVhdDogbm8tcmVwZWF0Ow0KfQ0KDQoudWktZmllbGRfX2Vy"
        "cm9yIHsNCiAgZGlzcGxheTogZmxleDsNCiAgYWxpZ24taXRlbXM6IGNlbnRlcjsNCiAgZ2FwOiB2YXIoLS1zcGFjZS0xKTsN"
        "CiAgZm9udC1zaXplOiB2YXIoLS10ZXh0LXNtKTsNCiAgY29sb3I6IHZhcigtLXN0YXRlLWFic2VudCk7DQp9DQoNCi51aS1m"
        "aWVsZF9faGludCB7IGZvbnQtc2l6ZTogdmFyKC0tdGV4dC1zbSk7IGNvbG9yOiB2YXIoLS10ZXh0LW11dGVkKTsgfQ0KDQov"
        "KiAtLS0gQmFkZ2UgLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0t"
        "LS0tICovDQoudWktYmFkZ2Ugew0KICBkaXNwbGF5OiBpbmxpbmUtZmxleDsNCiAgYWxpZ24taXRlbXM6IGNlbnRlcjsNCiAg"
        "Z2FwOiB2YXIoLS1zcGFjZS0xKTsNCiAgcGFkZGluZzogM3B4IHZhcigtLXNwYWNlLTIpOw0KICBib3JkZXItcmFkaXVzOiB2"
        "YXIoLS1yYWRpdXMtZnVsbCk7DQogIGZvbnQtc2l6ZTogdmFyKC0tdGV4dC14cyk7DQogIGZvbnQtd2VpZ2h0OiB2YXIoLS13"
        "ZWlnaHQtc2VtaWJvbGQpOw0KICBsaW5lLWhlaWdodDogMS41Ow0KICB3aGl0ZS1zcGFjZTogbm93cmFwOw0KfQ0KDQoudWkt"
        "YmFkZ2UtLXByZXNlbnQgeyBiYWNrZ3JvdW5kOiB2YXIoLS1zdGF0ZS1wcmVzZW50LWJnKTsgY29sb3I6IHZhcigtLXN0YXRl"
        "LXByZXNlbnQpOyB9DQoudWktYmFkZ2UtLWxhdGUgICAgeyBiYWNrZ3JvdW5kOiB2YXIoLS1zdGF0ZS1sYXRlLWJnKTsgICAg"
        "Y29sb3I6IHZhcigtLXN0YXRlLWxhdGUpOyB9DQoudWktYmFkZ2UtLWFic2VudCAgeyBiYWNrZ3JvdW5kOiB2YXIoLS1zdGF0"
        "ZS1hYnNlbnQtYmcpOyAgY29sb3I6IHZhcigtLXN0YXRlLWFic2VudCk7IH0NCi51aS1iYWRnZS0tbGVhdmUgICB7IGJhY2tn"
        "cm91bmQ6IHZhcigtLXN0YXRlLWxlYXZlLWJnKTsgICBjb2xvcjogdmFyKC0tc3RhdGUtbGVhdmUpOyB9DQoudWktYmFkZ2Ut"
        "LXBlbmRpbmcgeyBiYWNrZ3JvdW5kOiB2YXIoLS1zdGF0ZS1wZW5kaW5nLWJnKTsgY29sb3I6IHZhcigtLXN0YXRlLXBlbmRp"
        "bmcpOyB9DQoudWktYmFkZ2UtLW5ldXRyYWwgeyBiYWNrZ3JvdW5kOiB2YXIoLS1zdXJmYWNlLXN1bmtlbik7ICAgY29sb3I6"
        "IHZhcigtLXRleHQtc2Vjb25kYXJ5KTsgfQ0KDQovKiAtLS0gU3RhdHVzIGRvdCAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0t"
        "LS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tICovDQoudWktZG90IHsNCiAgZGlzcGxheTogaW5saW5lLWJsb2Nr"
        "Ow0KICB3aWR0aDogOHB4OyBoZWlnaHQ6IDhweDsNCiAgYm9yZGVyLXJhZGl1czogdmFyKC0tcmFkaXVzLWZ1bGwpOw0KICBm"
        "bGV4LXNocmluazogMDsNCn0NCi51aS1kb3QtLXByZXNlbnQgeyBiYWNrZ3JvdW5kOiB2YXIoLS1zdGF0ZS1wcmVzZW50KTsg"
        "fQ0KLnVpLWRvdC0tbGF0ZSAgICB7IGJhY2tncm91bmQ6IHZhcigtLXN0YXRlLWxhdGUpOyB9DQoudWktZG90LS1hYnNlbnQg"
        "IHsgYmFja2dyb3VuZDogdmFyKC0tc3RhdGUtYWJzZW50KTsgfQ0KLnVpLWRvdC0tbGVhdmUgICB7IGJhY2tncm91bmQ6IHZh"
        "cigtLXN0YXRlLWxlYXZlKTsgfQ0KLnVpLWRvdC0tcGVuZGluZyB7IGJhY2tncm91bmQ6IHZhcigtLXN0YXRlLXBlbmRpbmcp"
        "OyB9DQoudWktZG90LS1uZXV0cmFsIHsgYmFja2dyb3VuZDogdmFyKC0tdGV4dC1tdXRlZCk7IH0NCg0KLyogLS0tIFRhYmxl"
        "IC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSAqLw0KLnVp"
        "LXRhYmxlLXdyYXAgew0KICB3aWR0aDogMTAwJTsNCiAgb3ZlcmZsb3cteDogYXV0bzsNCiAgYm9yZGVyOiAxcHggc29saWQg"
        "dmFyKC0tYm9yZGVyKTsNCiAgYm9yZGVyLXJhZGl1czogdmFyKC0tcmFkaXVzLWxnKTsNCiAgYmFja2dyb3VuZDogdmFyKC0t"
        "c3VyZmFjZSk7DQp9DQoNCi51aS10YWJsZSB7DQogIHdpZHRoOiAxMDAlOw0KICBib3JkZXItY29sbGFwc2U6IGNvbGxhcHNl"
        "Ow0KICBmb250LXNpemU6IHZhcigtLXRleHQtc20pOw0KfQ0KDQoudWktdGFibGUgdGhlYWQgdGggew0KICBwb3NpdGlvbjog"
        "c3RpY2t5Ow0KICB0b3A6IDA7DQogIHotaW5kZXg6IDE7DQogIHBhZGRpbmc6IHZhcigtLXNwYWNlLTMpIHZhcigtLXNwYWNl"
        "LTQpOw0KICBiYWNrZ3JvdW5kOiB2YXIoLS1zdXJmYWNlLXN1bmtlbik7DQogIGJvcmRlci1ib3R0b206IDFweCBzb2xpZCB2"
        "YXIoLS1ib3JkZXIpOw0KICBjb2xvcjogdmFyKC0tdGV4dC1tdXRlZCk7DQogIGZvbnQtc2l6ZTogdmFyKC0tdGV4dC14cyk7"
        "DQogIGZvbnQtd2VpZ2h0OiB2YXIoLS13ZWlnaHQtc2VtaWJvbGQpOw0KICBsZXR0ZXItc3BhY2luZzogdmFyKC0tdHJhY2tp"
        "bmctd2lkZSk7DQogIHRleHQtdHJhbnNmb3JtOiB1cHBlcmNhc2U7DQogIHRleHQtYWxpZ246IGxlZnQ7DQogIHdoaXRlLXNw"
        "YWNlOiBub3dyYXA7DQp9DQoNCi51aS10YWJsZSB0Ym9keSB0ZCB7DQogIHBhZGRpbmc6IHZhcigtLXNwYWNlLTMpIHZhcigt"
        "LXNwYWNlLTQpOw0KICBib3JkZXItYm90dG9tOiAxcHggc29saWQgdmFyKC0tYm9yZGVyKTsNCiAgY29sb3I6IHZhcigtLXRl"
        "eHQpOw0KICB2ZXJ0aWNhbC1hbGlnbjogbWlkZGxlOw0KfQ0KDQoudWktdGFibGUgdGJvZHkgdHI6bGFzdC1jaGlsZCB0ZCB7"
        "IGJvcmRlci1ib3R0b206IG5vbmU7IH0NCi51aS10YWJsZSB0Ym9keSB0cjpob3ZlciB0ZCB7IGJhY2tncm91bmQ6IHZhcigt"
        "LXN1cmZhY2UtaG92ZXIpOyB9DQoNCi51aS10YWJsZSB0ZFtkYXRhLW51bWVyaWNdLA0KLnVpLXRhYmxlIHRoW2RhdGEtbnVt"
        "ZXJpY10geyB0ZXh0LWFsaWduOiByaWdodDsgZm9udC12YXJpYW50LW51bWVyaWM6IHRhYnVsYXItbnVtczsgfQ0KDQovKiAt"
        "LS0gRW1wdHkgc3RhdGUgLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0t"
        "ICovDQoudWktZW1wdHkgew0KICBkaXNwbGF5OiBmbGV4Ow0KICBmbGV4LWRpcmVjdGlvbjogY29sdW1uOw0KICBhbGlnbi1p"
        "dGVtczogY2VudGVyOw0KICBqdXN0aWZ5LWNvbnRlbnQ6IGNlbnRlcjsNCiAgZ2FwOiB2YXIoLS1zcGFjZS0zKTsNCiAgcGFk"
        "ZGluZzogdmFyKC0tc3BhY2UtMTIpIHZhcigtLXNwYWNlLTYpOw0KICB0ZXh0LWFsaWduOiBjZW50ZXI7DQp9DQoNCi51aS1l"
        "bXB0eV9faWNvbiB7DQogIGRpc3BsYXk6IGdyaWQ7DQogIHBsYWNlLWl0ZW1zOiBjZW50ZXI7DQogIHdpZHRoOiA0OHB4OyBo"
        "ZWlnaHQ6IDQ4cHg7DQogIGJvcmRlci1yYWRpdXM6IHZhcigtLXJhZGl1cy1mdWxsKTsNCiAgYmFja2dyb3VuZDogdmFyKC0t"
        "c3VyZmFjZS1zdW5rZW4pOw0KICBjb2xvcjogdmFyKC0tdGV4dC1tdXRlZCk7DQogIGZvbnQtc2l6ZTogMjBweDsNCn0NCg0K"
        "LnVpLWVtcHR5X190aXRsZSB7IGZvbnQtc2l6ZTogdmFyKC0tdGV4dC1tZCk7IGZvbnQtd2VpZ2h0OiB2YXIoLS13ZWlnaHQt"
        "c2VtaWJvbGQpOyBjb2xvcjogdmFyKC0tdGV4dCk7IH0NCi51aS1lbXB0eV9fYm9keSAgeyBtYXgtd2lkdGg6IDQyY2g7IGZv"
        "bnQtc2l6ZTogdmFyKC0tdGV4dC1zbSk7IGNvbG9yOiB2YXIoLS10ZXh0LW11dGVkKTsgfQ0KDQovKiAtLS0gU3Bpbm5lciAv"
        "IHNrZWxldG9uIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tICovDQoudWktc3Bp"
        "bm5lciB7DQogIGJvcmRlcjogMnB4IHNvbGlkIHZhcigtLWJvcmRlci1zdHJvbmcpOw0KICBib3JkZXItcmlnaHQtY29sb3I6"
        "IHZhcigtLWJyYW5kLTUwMCk7DQogIGJvcmRlci1yYWRpdXM6IHZhcigtLXJhZGl1cy1mdWxsKTsNCiAgYW5pbWF0aW9uOiB1"
        "aS1zcGluIDAuNnMgbGluZWFyIGluZmluaXRlOw0KfQ0KLnVpLXNwaW5uZXItLXNtIHsgd2lkdGg6IDE2cHg7IGhlaWdodDog"
        "MTZweDsgfQ0KLnVpLXNwaW5uZXItLW1kIHsgd2lkdGg6IDI0cHg7IGhlaWdodDogMjRweDsgfQ0KLnVpLXNwaW5uZXItLWxn"
        "IHsgd2lkdGg6IDM2cHg7IGhlaWdodDogMzZweDsgYm9yZGVyLXdpZHRoOiAzcHg7IH0NCg0KLnVpLXNwaW5uZXItd3JhcCB7"
        "DQogIGRpc3BsYXk6IGZsZXg7DQogIGZsZXgtZGlyZWN0aW9uOiBjb2x1bW47DQogIGFsaWduLWl0ZW1zOiBjZW50ZXI7DQog"
        "IGdhcDogdmFyKC0tc3BhY2UtMyk7DQogIHBhZGRpbmc6IHZhcigtLXNwYWNlLTEyKTsNCiAgY29sb3I6IHZhcigtLXRleHQt"
        "bXV0ZWQpOw0KICBmb250LXNpemU6IHZhcigtLXRleHQtc20pOw0KfQ0KDQoudWktc2tlbGV0b24gew0KICBiYWNrZ3JvdW5k"
        "OiBsaW5lYXItZ3JhZGllbnQoDQogICAgOTBkZWcsDQogICAgdmFyKC0tc3VyZmFjZS1zdW5rZW4pIDI1JSwNCiAgICB2YXIo"
        "LS1zdXJmYWNlLWhvdmVyKSAzNyUsDQogICAgdmFyKC0tc3VyZmFjZS1zdW5rZW4pIDYzJQ0KICApOw0KICBiYWNrZ3JvdW5k"
        "LXNpemU6IDQwMCUgMTAwJTsNCiAgYm9yZGVyLXJhZGl1czogdmFyKC0tcmFkaXVzLXNtKTsNCiAgYW5pbWF0aW9uOiB1aS1z"
        "aGltbWVyIDEuNHMgZWFzZSBpbmZpbml0ZTsNCn0NCg0KQGtleWZyYW1lcyB1aS1zaGltbWVyIHsNCiAgMCUgICB7IGJhY2tn"
        "cm91bmQtcG9zaXRpb246IDEwMCUgNTAlOyB9DQogIDEwMCUgeyBiYWNrZ3JvdW5kLXBvc2l0aW9uOiAwIDUwJTsgfQ0KfQ0K"
        "DQovKiAtLS0gVGhlbWUgdG9nZ2xlIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0t"
        "LS0tLS0tICovDQoudWktdGhlbWUtdG9nZ2xlIHsNCiAgZGlzcGxheTogaW5saW5lLWZsZXg7DQogIGFsaWduLWl0ZW1zOiBj"
        "ZW50ZXI7DQogIGp1c3RpZnktY29udGVudDogY2VudGVyOw0KICB3aWR0aDogNDBweDsgaGVpZ2h0OiA0MHB4Ow0KICBiYWNr"
        "Z3JvdW5kOiB0cmFuc3BhcmVudDsNCiAgYm9yZGVyOiAxcHggc29saWQgdmFyKC0tYm9yZGVyKTsNCiAgYm9yZGVyLXJhZGl1"
        "czogdmFyKC0tcmFkaXVzLW1kKTsNCiAgY29sb3I6IHZhcigtLXRleHQtc2Vjb25kYXJ5KTsNCiAgY3Vyc29yOiBwb2ludGVy"
        "Ow0KICB0cmFuc2l0aW9uOiBiYWNrZ3JvdW5kLWNvbG9yIHZhcigtLWR1cmF0aW9uLWZhc3QpIHZhcigtLWVhc2UpLA0KICAg"
        "ICAgICAgICAgICBjb2xvciB2YXIoLS1kdXJhdGlvbi1mYXN0KSB2YXIoLS1lYXNlKSwNCiAgICAgICAgICAgICAgYm9yZGVy"
        "LWNvbG9yIHZhcigtLWR1cmF0aW9uLWZhc3QpIHZhcigtLWVhc2UpOw0KfQ0KLnVpLXRoZW1lLXRvZ2dsZTpob3ZlciB7DQog"
        "IGJhY2tncm91bmQ6IHZhcigtLXN1cmZhY2Utc3Vua2VuKTsNCiAgY29sb3I6IHZhcigtLXRleHQpOw0KICBib3JkZXItY29s"
        "b3I6IHZhcigtLWJvcmRlci1zdHJvbmcpOw0KfQ0KLnVpLXRoZW1lLXRvZ2dsZTpmb2N1cy12aXNpYmxlIHsgYm94LXNoYWRv"
        "dzogdmFyKC0tcmluZyk7IG91dGxpbmU6IG5vbmU7IH0NCg0KLyogLS0tIFJlc3BvbnNpdmUgLS0tLS0tLS0tLS0tLS0tLS0t"
        "LS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSAqLw0KQG1lZGlhIChtYXgtd2lkdGg6IDY0MHB4KSB7"
        "DQogIC51aS1jYXJkX19oZWFkZXIsDQogIC51aS1jYXJkX19ib2R5LA0KICAudWktY2FyZC0tcGFkIHsgcGFkZGluZzogdmFy"
        "KC0tc3BhY2UtNCk7IH0NCg0KICAudWktc3RhdF9fdmFsdWUgeyBmb250LXNpemU6IHZhcigtLXRleHQtMnhsKTsgfQ0KICAu"
        "dWktdGFibGUgdGhlYWQgdGgsDQogIC51aS10YWJsZSB0Ym9keSB0ZCB7IHBhZGRpbmc6IHZhcigtLXNwYWNlLTIpIHZhcigt"
        "LXNwYWNlLTMpOyB9DQp9DQo="
    ),
    "src/main.jsx": (
        "aW1wb3J0IFJlYWN0IGZyb20gInJlYWN0IjsKaW1wb3J0IFJlYWN0RE9NIGZyb20gInJlYWN0LWRvbS9jbGllbnQiOwppbXBv"
        "cnQgeyBCcm93c2VyUm91dGVyIH0gZnJvbSAicmVhY3Qtcm91dGVyLWRvbSI7CgovLyAxLiBUb2tlbnMgZmlyc3QgLSBkZWZp"
        "bmVzIGV2ZXJ5IGNvbG91ciwgc2l6ZSBhbmQgc2hhZG93LgppbXBvcnQgIi4vdGhlbWUvdG9rZW5zLmNzcyI7CgovLyAyLiBB"
        "cHAgKGFuZCB3aXRoIGl0LCBldmVyeSBwYWdlIHN0eWxlc2hlZXQpLgppbXBvcnQgQXBwIGZyb20gIi4vQXBwLmpzeCI7Cgov"
        "LyAzLiBSZXRyb2ZpdCBsYXllciBMQVNUIHNvIGl0IG92ZXJyaWRlcyB0aGUgb2xkIGhhcmRjb2RlZCBwYWdlIGNvbG91cnMu"
        "CmltcG9ydCAiLi90aGVtZS9hcHAtdGhlbWUuY3NzIjsKCmltcG9ydCB7IFRoZW1lUHJvdmlkZXIgfSBmcm9tICIuL3RoZW1l"
        "L1RoZW1lUHJvdmlkZXIiOwppbXBvcnQgRmxvYXRpbmdUaGVtZVRvZ2dsZSBmcm9tICIuL3RoZW1lL0Zsb2F0aW5nVGhlbWVU"
        "b2dnbGUiOwoKUmVhY3RET00uY3JlYXRlUm9vdChkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgicm9vdCIpKS5yZW5kZXIoCiAg"
        "PFRoZW1lUHJvdmlkZXI+CiAgICA8QnJvd3NlclJvdXRlcj4KICAgICAgPEFwcCAvPgogICAgICA8RmxvYXRpbmdUaGVtZVRv"
        "Z2dsZSAvPgogICAgPC9Ccm93c2VyUm91dGVyPgogIDwvVGhlbWVQcm92aWRlcj4KKTsK"
    ),
    "src/theme/FloatingThemeToggle.jsx": (
        "aW1wb3J0IHsgdXNlTG9jYXRpb24gfSBmcm9tICJyZWFjdC1yb3V0ZXItZG9tIjsKaW1wb3J0IHsgdXNlVGhlbWUgfSBmcm9t"
        "ICIuL1RoZW1lUHJvdmlkZXIiOwppbXBvcnQgeyBQaU1vb25EdW90b25lLCBQaVN1bkR1b3RvbmUgfSBmcm9tICJyZWFjdC1p"
        "Y29ucy9waSI7CgovLyBQYWdlcyB3aXRoIG5vIHNpZGViYXIuIFRoZSBhZG1pbiBzaWRlYmFyIGNhcnJpZXMgaXRzIG93biBz"
        "d2l0Y2gsIHNvIHRoZQovLyBmbG9hdGluZyBidXR0b24gd291bGQgYmUgYSBkdXBsaWNhdGUgZXZlcnl3aGVyZSBlbHNlIC0g"
        "YW5kIG9uIHRoZSBsb2dpbgovLyBzY3JlZW4gaXQgbGFuZHMgb24gdG9wIG9mIHRoZSBmb290ZXIgbGlua3MuCmNvbnN0IE5P"
        "X1NJREVCQVIgPSBbIi9sb2dpbiIsICIvb3RwIiwgIi9yZXNldC1wYXNzd29yZCJdOwoKLyoqCiAqIE9ubHkgYXBwZWFycyBv"
        "biBzY3JlZW5zIHRoYXQgaGF2ZSBubyBzaWRlYmFyIG9mIHRoZWlyIG93biwgc28gdGhlIHRoZW1lCiAqIGlzIHN0aWxsIHJl"
        "YWNoYWJsZSBiZWZvcmUgc2lnbi1pbiB3aXRob3V0IGNvdmVyaW5nIHBhZ2UgY29udGVudC4KICovCmV4cG9ydCBkZWZhdWx0"
        "IGZ1bmN0aW9uIEZsb2F0aW5nVGhlbWVUb2dnbGUoKSB7CiAgY29uc3QgeyB0aGVtZSwgdG9nZ2xlVGhlbWUgfSA9IHVzZVRo"
        "ZW1lKCk7CiAgY29uc3QgeyBwYXRobmFtZSB9ID0gdXNlTG9jYXRpb24oKTsKCiAgaWYgKCFOT19TSURFQkFSLmluY2x1ZGVz"
        "KHBhdGhuYW1lKSkgcmV0dXJuIG51bGw7CgogIGNvbnN0IGlzRGFyayA9IHRoZW1lID09PSAiZGFyayI7CgogIHJldHVybiAo"
        "CiAgICA8YnV0dG9uCiAgICAgIHR5cGU9ImJ1dHRvbiIKICAgICAgY2xhc3NOYW1lPSJhcHAtdGhlbWUtdG9nZ2xlIgogICAg"
        "ICBvbkNsaWNrPXt0b2dnbGVUaGVtZX0KICAgICAgdGl0bGU9e2lzRGFyayA/ICJTd2l0Y2ggdG8gbGlnaHQgbW9kZSIgOiAi"
        "U3dpdGNoIHRvIGRhcmsgbW9kZSJ9CiAgICAgIGFyaWEtbGFiZWw9e2lzRGFyayA/ICJTd2l0Y2ggdG8gbGlnaHQgbW9kZSIg"
        "OiAiU3dpdGNoIHRvIGRhcmsgbW9kZSJ9CiAgICA+CiAgICAgIHtpc0RhcmsgPyA8UGlTdW5EdW90b25lIC8+IDogPFBpTW9v"
        "bkR1b3RvbmUgLz59CiAgICA8L2J1dHRvbj4KICApOwp9Cg=="
    ),
    "src/theme/ThemeProvider.jsx": (
        "aW1wb3J0IHsgY3JlYXRlQ29udGV4dCwgdXNlQ29udGV4dCwgdXNlRWZmZWN0LCB1c2VTdGF0ZSwgdXNlQ2FsbGJhY2sgfSBm"
        "cm9tICJyZWFjdCI7DQoNCmNvbnN0IFNUT1JBR0VfS0VZID0gImxhZXNmZXJhLXRoZW1lIjsNCg0KY29uc3QgVGhlbWVDb250"
        "ZXh0ID0gY3JlYXRlQ29udGV4dCh7DQogIHRoZW1lOiAibGlnaHQiLA0KICBzZXRUaGVtZTogKCkgPT4ge30sDQogIHRvZ2ds"
        "ZVRoZW1lOiAoKSA9PiB7fSwNCn0pOw0KDQovKioNCiAqIFJlYWRzIHRoZSB0aGVtZSB0aGUgdXNlciBsYXN0IGNob3NlLiBG"
        "YWxscyBiYWNrIHRvIHdoYXRldmVyIHRoZWlyIE9TIGlzDQogKiBzZXQgdG8sIHNvIGEgZmlyc3QtdGltZSB2aXNpdG9yIG9u"
        "IGEgZGFyayBtYWNoaW5lIGdldHMgZGFyayBzdHJhaWdodCBhd2F5Lg0KICovDQpmdW5jdGlvbiBnZXRJbml0aWFsVGhlbWUo"
        "KSB7DQogIGlmICh0eXBlb2Ygd2luZG93ID09PSAidW5kZWZpbmVkIikgcmV0dXJuICJsaWdodCI7DQoNCiAgdHJ5IHsNCiAg"
        "ICBjb25zdCBzYXZlZCA9IHdpbmRvdy5sb2NhbFN0b3JhZ2UuZ2V0SXRlbShTVE9SQUdFX0tFWSk7DQogICAgaWYgKHNhdmVk"
        "ID09PSAibGlnaHQiIHx8IHNhdmVkID09PSAiZGFyayIpIHJldHVybiBzYXZlZDsNCiAgfSBjYXRjaCB7DQogICAgLyogcHJp"
        "dmF0ZSBtb2RlIC8gc3RvcmFnZSBkaXNhYmxlZCAtIGZhbGwgdGhyb3VnaCB0byB0aGUgT1Mgc2V0dGluZyAqLw0KICB9DQoN"
        "CiAgcmV0dXJuIHdpbmRvdy5tYXRjaE1lZGlhKCIocHJlZmVycy1jb2xvci1zY2hlbWU6IGRhcmspIikubWF0Y2hlcyA/ICJk"
        "YXJrIiA6ICJsaWdodCI7DQp9DQoNCmV4cG9ydCBmdW5jdGlvbiBUaGVtZVByb3ZpZGVyKHsgY2hpbGRyZW4gfSkgew0KICBj"
        "b25zdCBbdGhlbWUsIHNldFRoZW1lU3RhdGVdID0gdXNlU3RhdGUoZ2V0SW5pdGlhbFRoZW1lKTsNCg0KICAvLyBUaGUgc2lu"
        "Z2xlIHBsYWNlIHRoZSB0aGVtZSBpcyBhcHBsaWVkLiBFdmVyeSB0b2tlbiBpbiB0b2tlbnMuY3NzIGhhbmdzDQogIC8vIG9m"
        "ZiBbZGF0YS10aGVtZV0sIHNvIHNldHRpbmcgdGhpcyBhdHRyaWJ1dGUgcmUtdGhlbWVzIHRoZSBlbnRpcmUgYXBwLg0KICB1"
        "c2VFZmZlY3QoKCkgPT4gew0KICAgIGRvY3VtZW50LmRvY3VtZW50RWxlbWVudC5zZXRBdHRyaWJ1dGUoImRhdGEtdGhlbWUi"
        "LCB0aGVtZSk7DQogICAgdHJ5IHsNCiAgICAgIHdpbmRvdy5sb2NhbFN0b3JhZ2Uuc2V0SXRlbShTVE9SQUdFX0tFWSwgdGhl"
        "bWUpOw0KICAgIH0gY2F0Y2ggew0KICAgICAgLyogbm90IGZhdGFsIC0gdGhlIHRoZW1lIHN0aWxsIGFwcGxpZXMgZm9yIHRo"
        "aXMgc2Vzc2lvbiAqLw0KICAgIH0NCiAgfSwgW3RoZW1lXSk7DQoNCiAgLy8gRm9sbG93IHRoZSBPUyBpZiB0aGUgdXNlciBo"
        "YXMgbmV2ZXIgbWFkZSBhbiBleHBsaWNpdCBjaG9pY2UuDQogIHVzZUVmZmVjdCgoKSA9PiB7DQogICAgY29uc3QgbWVkaWEg"
        "PSB3aW5kb3cubWF0Y2hNZWRpYSgiKHByZWZlcnMtY29sb3Itc2NoZW1lOiBkYXJrKSIpOw0KDQogICAgY29uc3Qgb25DaGFu"
        "Z2UgPSAoZXZlbnQpID0+IHsNCiAgICAgIGxldCBoYXNDaG9zZW4gPSBmYWxzZTsNCiAgICAgIHRyeSB7DQogICAgICAgIGhh"
        "c0Nob3NlbiA9IEJvb2xlYW4od2luZG93LmxvY2FsU3RvcmFnZS5nZXRJdGVtKFNUT1JBR0VfS0VZKSk7DQogICAgICB9IGNh"
        "dGNoIHsNCiAgICAgICAgaGFzQ2hvc2VuID0gZmFsc2U7DQogICAgICB9DQogICAgICBpZiAoIWhhc0Nob3Nlbikgc2V0VGhl"
        "bWVTdGF0ZShldmVudC5tYXRjaGVzID8gImRhcmsiIDogImxpZ2h0Iik7DQogICAgfTsNCg0KICAgIG1lZGlhLmFkZEV2ZW50"
        "TGlzdGVuZXIoImNoYW5nZSIsIG9uQ2hhbmdlKTsNCiAgICByZXR1cm4gKCkgPT4gbWVkaWEucmVtb3ZlRXZlbnRMaXN0ZW5l"
        "cigiY2hhbmdlIiwgb25DaGFuZ2UpOw0KICB9LCBbXSk7DQoNCiAgY29uc3Qgc2V0VGhlbWUgPSB1c2VDYWxsYmFjaygobmV4"
        "dCkgPT4gew0KICAgIHNldFRoZW1lU3RhdGUobmV4dCA9PT0gImRhcmsiID8gImRhcmsiIDogImxpZ2h0Iik7DQogIH0sIFtd"
        "KTsNCg0KICBjb25zdCB0b2dnbGVUaGVtZSA9IHVzZUNhbGxiYWNrKCgpID0+IHsNCiAgICBzZXRUaGVtZVN0YXRlKChjdXJy"
        "ZW50KSA9PiAoY3VycmVudCA9PT0gImRhcmsiID8gImxpZ2h0IiA6ICJkYXJrIikpOw0KICB9LCBbXSk7DQoNCiAgcmV0dXJu"
        "ICgNCiAgICA8VGhlbWVDb250ZXh0LlByb3ZpZGVyIHZhbHVlPXt7IHRoZW1lLCBzZXRUaGVtZSwgdG9nZ2xlVGhlbWUgfX0+"
        "DQogICAgICB7Y2hpbGRyZW59DQogICAgPC9UaGVtZUNvbnRleHQuUHJvdmlkZXI+DQogICk7DQp9DQoNCmV4cG9ydCBmdW5j"
        "dGlvbiB1c2VUaGVtZSgpIHsNCiAgcmV0dXJuIHVzZUNvbnRleHQoVGhlbWVDb250ZXh0KTsNCn0NCg0KZXhwb3J0IGRlZmF1"
        "bHQgVGhlbWVQcm92aWRlcjsNCg=="
    ),
    "src/theme/app-theme.css": (
        "LyogPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09"
        "PT09PT0KICAgYXBwLXRoZW1lLmNzcyAtIFJFVFJPRklUIExBWUVSCiAgIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0t"
        "LS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tCiAgIFRoZSAzNyBleGlzdGluZyBwYWdlcyBl"
        "YWNoIGNhcnJ5IHRoZWlyIG93biBoYXJkY29kZWQgY29sb3Vycy4gUmV3cml0aW5nCiAgIHRoZW0gYWxsIGlzIGEgbG9uZyBq"
        "b2I7IHRoaXMgZmlsZSBtYWtlcyB0aGVtIGFsbCB0aGVtZSBjb3JyZWN0bHkgTk9XIGJ5CiAgIG92ZXJyaWRpbmcgdGhvc2Ug"
        "Y29sb3VycyB3aXRoIHRva2VucywgbWF0Y2hlZCB0byB0aGUgY2xhc3MgbmFtZXMgYWxyZWFkeQogICBpbiB0aGUgbWFya3Vw"
        "LgoKICAgTG9hZGVkIGxhc3QsIHNvIGl0IHdpbnMuIEFzIHBhZ2VzIGdldCBwcm9wZXJseSByZWJ1aWx0IG9uIHRoZSBwcmlt"
        "aXRpdmVzCiAgIGluIGNvbXBvbmVudHMvdWksIHRoZWlyIHJ1bGVzIGhlcmUgY2FuIGJlIGRlbGV0ZWQuCiAgID09PT09PT09"
        "PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09ICovCgov"
        "KiAtLS0gUGFnZSBjYW52YXMgLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0t"
        "LS0tICovCmh0bWwsCmJvZHksCiNyb290IHsKICBiYWNrZ3JvdW5kOiB2YXIoLS1jYW52YXMpICFpbXBvcnRhbnQ7CiAgY29s"
        "b3I6IHZhcigtLXRleHQpOwogIGZvbnQtZmFtaWx5OiB2YXIoLS1mb250LXNhbnMpICFpbXBvcnRhbnQ7Cn0KCi8qIFBhZ2Ug"
        "d3JhcHBlcnMgdXNlZCBhY3Jvc3MgdGhlIGFwcCAqLwoubGVhdmUtYXBwLXNjcmVlbiwKLmRhaWx5LXRhc2stcGFnZSwKLnRl"
        "YW0tbGVhdmUtc2NyZWVuLAouZGFzaGJvYXJkLAouZGFzaGJvYXJkLWNvbnRhaW5lciwKLnBhZ2UsCi5wYWdlLWNvbnRhaW5l"
        "ciwKLm1haW4tY29udGVudCwKLmNvbnRlbnQsCi5jb250ZW50LWFyZWEsCi5hdHQtYWxsLXBhZ2UsCi5lbXAtZGlyZWN0b3J5"
        "LAoucHJvZmlsZS1wYWdlLAoudGlja2V0cy1wYWdlLAoucmVndWxhcml6YXRpb24tcGFnZSwKLnBvbGljaWVzLXBhZ2Ugewog"
        "IGJhY2tncm91bmQ6IHZhcigtLWNhbnZhcykgIWltcG9ydGFudDsKICBjb2xvcjogdmFyKC0tdGV4dCk7Cn0KCi8qIEFueXRo"
        "aW5nIHN0aWxsIGRlY2xhcmluZyBwbGFpbiB3aGl0ZSAvIG5lYXItd2hpdGUgYXMgYSBwYWdlIGJhY2tncm91bmQgKi8KW2Ns"
        "YXNzKj0nLXNjcmVlbiddLApbY2xhc3MqPSctcGFnZSddLApbY2xhc3MqPSctY29udGFpbmVyJ10sCltjbGFzcyo9Jy13cmFw"
        "cGVyJ10gewogIGNvbG9yOiB2YXIoLS10ZXh0KTsKfQoKLyogLS0tIFR5cG9ncmFwaHkgLS0tLS0tLS0tLS0tLS0tLS0tLS0t"
        "LS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSAqLwpib2R5LApidXR0b24sCmlucHV0LApzZWxlY3QsCnRl"
        "eHRhcmVhLAp0YWJsZSwKbGFiZWwsCnAsIHNwYW4sIGRpdiwgbGksIHRkLCB0aCwgYSB7CiAgZm9udC1mYW1pbHk6IHZhcigt"
        "LWZvbnQtc2FucykgIWltcG9ydGFudDsKfQoKaDEsIGgyLCBoMywgaDQsIGg1LCBoNiB7IGNvbG9yOiB2YXIoLS10ZXh0KSAh"
        "aW1wb3J0YW50OyB9CgpoMSB7IGZvbnQtc2l6ZTogdmFyKC0tdGV4dC0yeGwpICFpbXBvcnRhbnQ7IGZvbnQtd2VpZ2h0OiB2"
        "YXIoLS13ZWlnaHQtc2VtaWJvbGQpICFpbXBvcnRhbnQ7IGxldHRlci1zcGFjaW5nOiB2YXIoLS10cmFja2luZy10aWdodCk7"
        "IH0KaDIgeyBmb250LXNpemU6IHZhcigtLXRleHQteGwpICFpbXBvcnRhbnQ7IGZvbnQtd2VpZ2h0OiB2YXIoLS13ZWlnaHQt"
        "c2VtaWJvbGQpICFpbXBvcnRhbnQ7IGxldHRlci1zcGFjaW5nOiB2YXIoLS10cmFja2luZy10aWdodCk7IH0KaDMgeyBmb250"
        "LXNpemU6IHZhcigtLXRleHQtbGcpICFpbXBvcnRhbnQ7IGZvbnQtd2VpZ2h0OiB2YXIoLS13ZWlnaHQtc2VtaWJvbGQpICFp"
        "bXBvcnRhbnQ7IH0KaDQgeyBmb250LXNpemU6IHZhcigtLXRleHQtbWQpICFpbXBvcnRhbnQ7IGZvbnQtd2VpZ2h0OiB2YXIo"
        "LS13ZWlnaHQtc2VtaWJvbGQpICFpbXBvcnRhbnQ7IH0KCi8qIC0tLSBTaWRlYmFyIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0t"
        "LS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0KICAgU2lkZWJhci5qc3ggKyBzaWRlYmFyLmNzcyBvd24g"
        "dGhlaXIgb3duIHN0eWxpbmcgbm93OyBub3RoaW5nIHRvIG92ZXJyaWRlCiAgIGhlcmUuIFRoZSBlbXBsb3llZSBhbmQgdGVh"
        "bS1sZWFkZXIgcmFpbHMgc3RpbGwgdXNlIHRoZSBvbGQgdmlvbGV0IHNsYWIsCiAgIHNvIGtlZXAgdGhlbSByZWFkYWJsZSBp"
        "biBkYXJrIG1vZGUgdW50aWwgdGhleSdyZSByZWJ1aWx0IHRvby4gICAgICAgICovCltkYXRhLXRoZW1lPSdkYXJrJ10gLnNp"
        "ZGViYXItZW1wLApbZGF0YS10aGVtZT0nZGFyayddIC5zaWRlYmFyX3RsLApbZGF0YS10aGVtZT0nZGFyayddIC5zaWRlYmFy"
        "LXRsIHsgYmFja2dyb3VuZDogIzIyMUEzQyAhaW1wb3J0YW50OyB9CgovKiAtLS0gQ2FyZHMgLyBwYW5lbHMgLS0tLS0tLS0t"
        "LS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tICovCi5jYXJkLAoucGFuZWwsCi5ib3gsCi5z"
        "dW1tYXJ5LWNvbnRhaW5lciwKLm1ldHJpYywKLnN0YXQtY2FyZCwKLnN0YXQtbGVmdCwKLndpZGdldCwKLmRhc2gtY2FyZCwK"
        "LmluZm8tY2FyZCwKLnByb2ZpbGUtY2FyZCwKLnNlY3Rpb24tY2FyZCwKW2NsYXNzKj0nLWNhcmQnXSwKW2NsYXNzKj0nLWJv"
        "eCddLApbY2xhc3MqPSctcGFuZWwnXSB7CiAgYmFja2dyb3VuZDogdmFyKC0tc3VyZmFjZSkgIWltcG9ydGFudDsKICBib3Jk"
        "ZXItY29sb3I6IHZhcigtLWJvcmRlcikgIWltcG9ydGFudDsKICBjb2xvcjogdmFyKC0tdGV4dCk7CiAgYm9yZGVyLXJhZGl1"
        "czogdmFyKC0tcmFkaXVzLWxnKTsKICBib3gtc2hhZG93OiB2YXIoLS1zaGFkb3ctc20pOwogIHRyYW5zaXRpb246IGJhY2tn"
        "cm91bmQtY29sb3IgdmFyKC0tZHVyYXRpb24tYmFzZSkgdmFyKC0tZWFzZSksCiAgICAgICAgICAgICAgYm9yZGVyLWNvbG9y"
        "IHZhcigtLWR1cmF0aW9uLWJhc2UpIHZhcigtLWVhc2UpOwp9CgovKiAtLS0gVGFibGVzIC0tLS0tLS0tLS0tLS0tLS0tLS0t"
        "LS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tICovCnRhYmxlLAoudGFibGUsCi50aWNrZXRzLXRh"
        "YmxlLAoubXktdGlja2V0cy10YWJsZSwKLmRvYy10YWJsZSwKLnBheW1lbnQtdGFibGUsCi5kYXNoLXRhYmxlLAouYXR0LWFs"
        "bC10YWJsZSwKW2NsYXNzKj0nLXRhYmxlJ10gewogIGJhY2tncm91bmQ6IHZhcigtLXN1cmZhY2UpICFpbXBvcnRhbnQ7CiAg"
        "Y29sb3I6IHZhcigtLXRleHQpICFpbXBvcnRhbnQ7CiAgYm9yZGVyLWNvbGxhcHNlOiBjb2xsYXBzZTsKICBmb250LXZhcmlh"
        "bnQtbnVtZXJpYzogdGFidWxhci1udW1zOwp9Cgp0YWJsZSB0aGVhZCB0aCwKLnRhYmxlIHRoZWFkIHRoLApbY2xhc3MqPSct"
        "dGFibGUnXSB0aGVhZCB0aCwKdGggewogIGJhY2tncm91bmQ6IHZhcigtLXN1cmZhY2Utc3Vua2VuKSAhaW1wb3J0YW50Owog"
        "IGNvbG9yOiB2YXIoLS10ZXh0LW11dGVkKSAhaW1wb3J0YW50OwogIGJvcmRlci1ib3R0b206IDFweCBzb2xpZCB2YXIoLS1i"
        "b3JkZXIpICFpbXBvcnRhbnQ7CiAgZm9udC1zaXplOiB2YXIoLS10ZXh0LXhzKSAhaW1wb3J0YW50OwogIGZvbnQtd2VpZ2h0"
        "OiB2YXIoLS13ZWlnaHQtc2VtaWJvbGQpICFpbXBvcnRhbnQ7CiAgbGV0dGVyLXNwYWNpbmc6IHZhcigtLXRyYWNraW5nLXdp"
        "ZGUpOwogIHRleHQtdHJhbnNmb3JtOiB1cHBlcmNhc2U7CiAgdGV4dC1hbGlnbjogbGVmdDsKICBwYWRkaW5nOiB2YXIoLS1z"
        "cGFjZS0zKSB2YXIoLS1zcGFjZS00KSAhaW1wb3J0YW50Owp9Cgp0YWJsZSB0Ym9keSB0ZCwKLnRhYmxlIHRib2R5IHRkLApb"
        "Y2xhc3MqPSctdGFibGUnXSB0Ym9keSB0ZCwKdGQgewogIGJhY2tncm91bmQ6IHRyYW5zcGFyZW50ICFpbXBvcnRhbnQ7CiAg"
        "Y29sb3I6IHZhcigtLXRleHQpICFpbXBvcnRhbnQ7CiAgYm9yZGVyLWJvdHRvbTogMXB4IHNvbGlkIHZhcigtLWJvcmRlcikg"
        "IWltcG9ydGFudDsKICBwYWRkaW5nOiB2YXIoLS1zcGFjZS0zKSB2YXIoLS1zcGFjZS00KSAhaW1wb3J0YW50Owp9Cgp0YWJs"
        "ZSB0Ym9keSB0cjpob3ZlciB0ZCwKW2NsYXNzKj0nLXRhYmxlJ10gdGJvZHkgdHI6aG92ZXIgdGQgeyBiYWNrZ3JvdW5kOiB2"
        "YXIoLS1zdXJmYWNlLWhvdmVyKSAhaW1wb3J0YW50OyB9CgovKiBaZWJyYSBzdHJpcGluZyB3cml0dGVuIGFnYWluc3Qgd2hp"
        "dGUgYnJlYWtzIGluIGRhcmsgbW9kZS4gKi8KdGFibGUgdGJvZHkgdHI6bnRoLWNoaWxkKGV2ZW4pIHRkLAp0YWJsZSB0Ym9k"
        "eSB0cjpudGgtY2hpbGQob2RkKSB0ZCB7IGJhY2tncm91bmQtY29sb3I6IHRyYW5zcGFyZW50ICFpbXBvcnRhbnQ7IH0KCi8q"
        "IFRhYmxlcyBtdXN0IG5vdCBibG93IG91dCBuYXJyb3cgc2NyZWVucy4gKi8KLnRhYmxlLXdyYXAsCi50YWJsZS1yZXNwb25z"
        "aXZlLApbY2xhc3MqPSctdGFibGUnXTpub3QodGFibGUpIHsgb3ZlcmZsb3cteDogYXV0bzsgfQoKLyogLS0tIEZvcm1zIC0t"
        "LS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSAqLwppbnB1dDpu"
        "b3QoW3R5cGU9J2NoZWNrYm94J10pOm5vdChbdHlwZT0ncmFkaW8nXSk6bm90KFt0eXBlPSdyYW5nZSddKSwKc2VsZWN0LAp0"
        "ZXh0YXJlYSB7CiAgYmFja2dyb3VuZDogdmFyKC0tc3VyZmFjZSkgIWltcG9ydGFudDsKICBjb2xvcjogdmFyKC0tdGV4dCkg"
        "IWltcG9ydGFudDsKICBib3JkZXI6IDFweCBzb2xpZCB2YXIoLS1ib3JkZXItc3Ryb25nKSAhaW1wb3J0YW50OwogIGJvcmRl"
        "ci1yYWRpdXM6IHZhcigtLXJhZGl1cy1tZCkgIWltcG9ydGFudDsKICBmb250LXNpemU6IHZhcigtLXRleHQtYmFzZSk7CiAg"
        "cGFkZGluZzogdmFyKC0tc3BhY2UtMikgdmFyKC0tc3BhY2UtMyk7CiAgdHJhbnNpdGlvbjogYm9yZGVyLWNvbG9yIHZhcigt"
        "LWR1cmF0aW9uLWZhc3QpIHZhcigtLWVhc2UpLAogICAgICAgICAgICAgIGJveC1zaGFkb3cgdmFyKC0tZHVyYXRpb24tZmFz"
        "dCkgdmFyKC0tZWFzZSksCiAgICAgICAgICAgICAgYmFja2dyb3VuZC1jb2xvciB2YXIoLS1kdXJhdGlvbi1iYXNlKSB2YXIo"
        "LS1lYXNlKTsKfQoKaW5wdXQ6OnBsYWNlaG9sZGVyLAp0ZXh0YXJlYTo6cGxhY2Vob2xkZXIgeyBjb2xvcjogdmFyKC0tdGV4"
        "dC1tdXRlZCkgIWltcG9ydGFudDsgfQoKaW5wdXQ6aG92ZXI6bm90KDpkaXNhYmxlZCksCnNlbGVjdDpob3Zlcjpub3QoOmRp"
        "c2FibGVkKSwKdGV4dGFyZWE6aG92ZXI6bm90KDpkaXNhYmxlZCkgeyBib3JkZXItY29sb3I6IHZhcigtLXRleHQtbXV0ZWQp"
        "ICFpbXBvcnRhbnQ7IH0KCmlucHV0OmZvY3VzLApzZWxlY3Q6Zm9jdXMsCnRleHRhcmVhOmZvY3VzIHsKICBvdXRsaW5lOiBu"
        "b25lICFpbXBvcnRhbnQ7CiAgYm9yZGVyLWNvbG9yOiB2YXIoLS1ib3JkZXItZm9jdXMpICFpbXBvcnRhbnQ7CiAgYm94LXNo"
        "YWRvdzogdmFyKC0tcmluZykgIWltcG9ydGFudDsKfQoKaW5wdXQ6ZGlzYWJsZWQsCnNlbGVjdDpkaXNhYmxlZCwKdGV4dGFy"
        "ZWE6ZGlzYWJsZWQgewogIGJhY2tncm91bmQ6IHZhcigtLXN1cmZhY2Utc3Vua2VuKSAhaW1wb3J0YW50OwogIGNvbG9yOiB2"
        "YXIoLS10ZXh0LW11dGVkKSAhaW1wb3J0YW50OwogIGN1cnNvcjogbm90LWFsbG93ZWQ7Cn0KCmxhYmVsLAouZm9ybS1ncm91"
        "cCBsYWJlbCwKLmZvcm0tbGFiZWwgewogIGNvbG9yOiB2YXIoLS10ZXh0LXNlY29uZGFyeSkgIWltcG9ydGFudDsKICBmb250"
        "LXNpemU6IHZhcigtLXRleHQtc20pOwogIGZvbnQtd2VpZ2h0OiB2YXIoLS13ZWlnaHQtbWVkaXVtKTsKfQoKLmZvcm0tZ3Jv"
        "dXAgeyBtYXJnaW4tYm90dG9tOiB2YXIoLS1zcGFjZS00KTsgfQoKLmZvcm0tZ3JpZCB7CiAgZGlzcGxheTogZ3JpZDsKICBn"
        "cmlkLXRlbXBsYXRlLWNvbHVtbnM6IHJlcGVhdChhdXRvLWZpdCwgbWlubWF4KDIyMHB4LCAxZnIpKTsKICBnYXA6IHZhcigt"
        "LXNwYWNlLTQpOwp9CgovKiBOYXRpdmUgZGF0ZSBwaWNrZXJzIHJlbmRlciBhIGJsYWNrIGljb24gdGhhdCB2YW5pc2hlcyBv"
        "biBkYXJrLiAqLwpbZGF0YS10aGVtZT0nZGFyayddIGlucHV0W3R5cGU9J2RhdGUnXTo6LXdlYmtpdC1jYWxlbmRhci1waWNr"
        "ZXItaW5kaWNhdG9yLApbZGF0YS10aGVtZT0nZGFyayddIGlucHV0W3R5cGU9J3RpbWUnXTo6LXdlYmtpdC1jYWxlbmRhci1w"
        "aWNrZXItaW5kaWNhdG9yIHsKICBmaWx0ZXI6IGludmVydCgxKSBvcGFjaXR5KDAuNyk7Cn0KCi8qIC0tLSBCdXR0b25zIC0t"
        "LS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0gKi8KYnV0dG9uLAou"
        "YnRuLAouZWRpdC1idG4sCltjbGFzcyo9Jy1idG4nXSB7CiAgZm9udC1mYW1pbHk6IHZhcigtLWZvbnQtc2FucykgIWltcG9y"
        "dGFudDsKICBmb250LXNpemU6IHZhcigtLXRleHQtYmFzZSk7CiAgZm9udC13ZWlnaHQ6IHZhcigtLXdlaWdodC1tZWRpdW0p"
        "OwogIGJvcmRlci1yYWRpdXM6IHZhcigtLXJhZGl1cy1tZCkgIWltcG9ydGFudDsKICBjdXJzb3I6IHBvaW50ZXI7CiAgdHJh"
        "bnNpdGlvbjogYmFja2dyb3VuZC1jb2xvciB2YXIoLS1kdXJhdGlvbi1mYXN0KSB2YXIoLS1lYXNlKSwKICAgICAgICAgICAg"
        "ICBib3JkZXItY29sb3IgdmFyKC0tZHVyYXRpb24tZmFzdCkgdmFyKC0tZWFzZSksCiAgICAgICAgICAgICAgY29sb3IgdmFy"
        "KC0tZHVyYXRpb24tZmFzdCkgdmFyKC0tZWFzZSksCiAgICAgICAgICAgICAgYm94LXNoYWRvdyB2YXIoLS1kdXJhdGlvbi1m"
        "YXN0KSB2YXIoLS1lYXNlKTsKfQoKYnV0dG9uOmZvY3VzLXZpc2libGUsCi5idG46Zm9jdXMtdmlzaWJsZSB7IGJveC1zaGFk"
        "b3c6IHZhcigtLXJpbmcpOyBvdXRsaW5lOiBub25lOyB9CgpidXR0b246ZGlzYWJsZWQsCi5idG46ZGlzYWJsZWQgeyBvcGFj"
        "aXR5OiAwLjU7IGN1cnNvcjogbm90LWFsbG93ZWQ7IH0KCi8qIFByaW1hcnktbG9va2luZyBidXR0b25zIGtlZXAgdGhlaXIg"
        "YnJhbmQgZmlsbCBidXQgZnJvbSB0aGUgdG9rZW4uICovCi5idG4tcHJpbWFyeSwKLmJ0bi5wcmltYXJ5LAouc2F2ZS1idG4s"
        "Ci5zdWJtaXQtYnRuLAouYXBwbHktYnRuLAouYWRkLWJ0biwKLmxvZ2luLWJ0biB7CiAgYmFja2dyb3VuZDogdmFyKC0tYnJh"
        "bmQtNTAwKSAhaW1wb3J0YW50OwogIGNvbG9yOiB2YXIoLS10ZXh0LW9uLWJyYW5kKSAhaW1wb3J0YW50OwogIGJvcmRlcjog"
        "MXB4IHNvbGlkIHRyYW5zcGFyZW50ICFpbXBvcnRhbnQ7Cn0KCi5idG4tcHJpbWFyeTpob3ZlciwKLmJ0bi5wcmltYXJ5Omhv"
        "dmVyLAouc2F2ZS1idG46aG92ZXIsCi5zdWJtaXQtYnRuOmhvdmVyLAouYXBwbHktYnRuOmhvdmVyLAouYWRkLWJ0bjpob3Zl"
        "ciwKLmxvZ2luLWJ0bjpob3ZlciB7IGJhY2tncm91bmQ6IHZhcigtLWJyYW5kLTYwMCkgIWltcG9ydGFudDsgfQoKLmJ0bi1z"
        "ZWNvbmRhcnksCi5jYW5jZWwtYnRuLAouY2xvc2UtYnRuLAouYnRuLnNlY29uZGFyeSB7CiAgYmFja2dyb3VuZDogdmFyKC0t"
        "c3VyZmFjZSkgIWltcG9ydGFudDsKICBjb2xvcjogdmFyKC0tdGV4dCkgIWltcG9ydGFudDsKICBib3JkZXI6IDFweCBzb2xp"
        "ZCB2YXIoLS1ib3JkZXItc3Ryb25nKSAhaW1wb3J0YW50Owp9CgouYnRuLXNlY29uZGFyeTpob3ZlciwKLmNhbmNlbC1idG46"
        "aG92ZXIsCi5idG4uc2Vjb25kYXJ5OmhvdmVyIHsgYmFja2dyb3VuZDogdmFyKC0tc3VyZmFjZS1ob3ZlcikgIWltcG9ydGFu"
        "dDsgfQoKLmRlbGV0ZS1idG4sCi5idG4tZGFuZ2VyLAoucmVqZWN0LWJ0biB7CiAgYmFja2dyb3VuZDogdmFyKC0tc3RhdGUt"
        "YWJzZW50KSAhaW1wb3J0YW50OwogIGNvbG9yOiAjZmZmICFpbXBvcnRhbnQ7CiAgYm9yZGVyOiAxcHggc29saWQgdHJhbnNw"
        "YXJlbnQgIWltcG9ydGFudDsKfQoKLyogLS0tIE1vZGFscyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0t"
        "LS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSAqLwoubW9kYWwtb3ZlcmxheSwKLm92ZXJsYXksCltjbGFzcyo9Jy1vdmVybGF5"
        "J10gewogIGJhY2tncm91bmQ6IHZhcigtLW92ZXJsYXkpICFpbXBvcnRhbnQ7CiAgYmFja2Ryb3AtZmlsdGVyOiBibHVyKDJw"
        "eCk7Cn0KCi5tb2RhbC1ib3gsCi5tb2RhbCwKLm1vZGFsLWNvbnRlbnQsCltjbGFzcyo9Jy1tb2RhbCddIHsKICBiYWNrZ3Jv"
        "dW5kOiB2YXIoLS1zdXJmYWNlKSAhaW1wb3J0YW50OwogIGNvbG9yOiB2YXIoLS10ZXh0KSAhaW1wb3J0YW50OwogIGJvcmRl"
        "cjogMXB4IHNvbGlkIHZhcigtLWJvcmRlcikgIWltcG9ydGFudDsKICBib3JkZXItcmFkaXVzOiB2YXIoLS1yYWRpdXMteGwp"
        "ICFpbXBvcnRhbnQ7CiAgYm94LXNoYWRvdzogdmFyKC0tc2hhZG93LWxnKSAhaW1wb3J0YW50Owp9CgoubW9kYWwtaGVhZGVy"
        "IHsKICBiYWNrZ3JvdW5kOiB2YXIoLS1zdXJmYWNlKSAhaW1wb3J0YW50OwogIGNvbG9yOiB2YXIoLS10ZXh0KSAhaW1wb3J0"
        "YW50OwogIGJvcmRlci1ib3R0b206IDFweCBzb2xpZCB2YXIoLS1ib3JkZXIpICFpbXBvcnRhbnQ7CiAgcGFkZGluZzogdmFy"
        "KC0tc3BhY2UtNSkgdmFyKC0tc3BhY2UtNikgIWltcG9ydGFudDsKfQoKLm1vZGFsLWJvZHkgewogIGJhY2tncm91bmQ6IHZh"
        "cigtLXN1cmZhY2UpICFpbXBvcnRhbnQ7CiAgY29sb3I6IHZhcigtLXRleHQpICFpbXBvcnRhbnQ7CiAgcGFkZGluZzogdmFy"
        "KC0tc3BhY2UtNikgIWltcG9ydGFudDsKfQoKLm1vZGFsLWZvb3RlciB7CiAgYmFja2dyb3VuZDogdmFyKC0tc3VyZmFjZSkg"
        "IWltcG9ydGFudDsKICBib3JkZXItdG9wOiAxcHggc29saWQgdmFyKC0tYm9yZGVyKSAhaW1wb3J0YW50OwogIHBhZGRpbmc6"
        "IHZhcigtLXNwYWNlLTQpIHZhcigtLXNwYWNlLTYpICFpbXBvcnRhbnQ7CiAgZGlzcGxheTogZmxleDsKICBqdXN0aWZ5LWNv"
        "bnRlbnQ6IGZsZXgtZW5kOwogIGdhcDogdmFyKC0tc3BhY2UtMyk7Cn0KCi5tb2RhbC1jbG9zZSB7CiAgYmFja2dyb3VuZDog"
        "dHJhbnNwYXJlbnQgIWltcG9ydGFudDsKICBjb2xvcjogdmFyKC0tdGV4dC1tdXRlZCkgIWltcG9ydGFudDsKICBib3JkZXI6"
        "IG5vbmUgIWltcG9ydGFudDsKfQoubW9kYWwtY2xvc2U6aG92ZXIgeyBjb2xvcjogdmFyKC0tdGV4dCkgIWltcG9ydGFudDsg"
        "YmFja2dyb3VuZDogdmFyKC0tc3VyZmFjZS1zdW5rZW4pICFpbXBvcnRhbnQ7IH0KCi8qIC0tLSBTdGF0dXMsIGJhZGdlcywg"
        "YWxlcnRzIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0gKi8KLmJhZGdlLAoucHJpb3Jp"
        "dHktYmFkZ2UsCi5zdGF0dXMsCi5zdGF0dXMtYmFkZ2UsCltjbGFzcyo9Jy1iYWRnZSddIHsKICBib3JkZXItcmFkaXVzOiB2"
        "YXIoLS1yYWRpdXMtZnVsbCkgIWltcG9ydGFudDsKICBmb250LXNpemU6IHZhcigtLXRleHQteHMpICFpbXBvcnRhbnQ7CiAg"
        "Zm9udC13ZWlnaHQ6IHZhcigtLXdlaWdodC1zZW1pYm9sZCkgIWltcG9ydGFudDsKICBwYWRkaW5nOiAzcHggdmFyKC0tc3Bh"
        "Y2UtMikgIWltcG9ydGFudDsKICBkaXNwbGF5OiBpbmxpbmUtZmxleDsKICBhbGlnbi1pdGVtczogY2VudGVyOwogIGdhcDog"
        "dmFyKC0tc3BhY2UtMSk7Cn0KCi8qIE1hdGNoIG9uIHRoZSB3b3JkcyB0aGUgQVBJIGFjdHVhbGx5IHJldHVybnMuICovCltj"
        "bGFzcyo9J3ByZXNlbnQnXSwgW2NsYXNzKj0nYXBwcm92ZWQnXSwgW2NsYXNzKj0nYWN0aXZlJ10sIFtjbGFzcyo9J3N1Y2Nl"
        "c3MnXSwgW2NsYXNzKj0nY29tcGxldGVkJ10gewogIC0tX3M6IHZhcigtLXN0YXRlLXByZXNlbnQpOyAtLV9zYjogdmFyKC0t"
        "c3RhdGUtcHJlc2VudC1iZyk7Cn0KW2NsYXNzKj0nbGF0ZSddLCBbY2xhc3MqPSd3YXJuaW5nJ10sIFtjbGFzcyo9J3BhcnRp"
        "YWwnXSB7CiAgLS1fczogdmFyKC0tc3RhdGUtbGF0ZSk7IC0tX3NiOiB2YXIoLS1zdGF0ZS1sYXRlLWJnKTsKfQpbY2xhc3Mq"
        "PSdhYnNlbnQnXSwgW2NsYXNzKj0ncmVqZWN0ZWQnXSwgW2NsYXNzKj0nZGFuZ2VyJ10sIFtjbGFzcyo9J2Vycm9yJ10sIFtj"
        "bGFzcyo9J2ZhaWxlZCddIHsKICAtLV9zOiB2YXIoLS1zdGF0ZS1hYnNlbnQpOyAtLV9zYjogdmFyKC0tc3RhdGUtYWJzZW50"
        "LWJnKTsKfQpbY2xhc3MqPSdsZWF2ZSddLCBbY2xhc3MqPSdob2xpZGF5J10sIFtjbGFzcyo9J2luZm8nXSB7CiAgLS1fczog"
        "dmFyKC0tc3RhdGUtbGVhdmUpOyAtLV9zYjogdmFyKC0tc3RhdGUtbGVhdmUtYmcpOwp9CltjbGFzcyo9J3BlbmRpbmcnXSwg"
        "W2NsYXNzKj0nYXdhaXRpbmcnXSwgW2NsYXNzKj0ncmV2aWV3J10gewogIC0tX3M6IHZhcigtLXN0YXRlLXBlbmRpbmcpOyAt"
        "LV9zYjogdmFyKC0tc3RhdGUtcGVuZGluZy1iZyk7Cn0KCi5iYWRnZVtjbGFzcyo9J3ByZXNlbnQnXSwgLnN0YXR1c1tjbGFz"
        "cyo9J3ByZXNlbnQnXSwgW2NsYXNzKj0nLWJhZGdlJ11bY2xhc3MqPSdwcmVzZW50J10sCi5iYWRnZVtjbGFzcyo9J2FwcHJv"
        "dmVkJ10sIC5zdGF0dXNbY2xhc3MqPSdhcHByb3ZlZCddLCBbY2xhc3MqPSctYmFkZ2UnXVtjbGFzcyo9J2FwcHJvdmVkJ10s"
        "Ci5iYWRnZVtjbGFzcyo9J2xhdGUnXSwgLnN0YXR1c1tjbGFzcyo9J2xhdGUnXSwgW2NsYXNzKj0nLWJhZGdlJ11bY2xhc3Mq"
        "PSdsYXRlJ10sCi5iYWRnZVtjbGFzcyo9J2Fic2VudCddLCAuc3RhdHVzW2NsYXNzKj0nYWJzZW50J10sIFtjbGFzcyo9Jy1i"
        "YWRnZSddW2NsYXNzKj0nYWJzZW50J10sCi5iYWRnZVtjbGFzcyo9J3JlamVjdGVkJ10sIC5zdGF0dXNbY2xhc3MqPSdyZWpl"
        "Y3RlZCddLCBbY2xhc3MqPSctYmFkZ2UnXVtjbGFzcyo9J3JlamVjdGVkJ10sCi5iYWRnZVtjbGFzcyo9J2xlYXZlJ10sIC5z"
        "dGF0dXNbY2xhc3MqPSdsZWF2ZSddLCBbY2xhc3MqPSctYmFkZ2UnXVtjbGFzcyo9J2xlYXZlJ10sCi5iYWRnZVtjbGFzcyo9"
        "J3BlbmRpbmcnXSwgLnN0YXR1c1tjbGFzcyo9J3BlbmRpbmcnXSwgW2NsYXNzKj0nLWJhZGdlJ11bY2xhc3MqPSdwZW5kaW5n"
        "J10gewogIGJhY2tncm91bmQ6IHZhcigtLV9zYikgIWltcG9ydGFudDsKICBjb2xvcjogdmFyKC0tX3MpICFpbXBvcnRhbnQ7"
        "CiAgYm9yZGVyOiBub25lICFpbXBvcnRhbnQ7Cn0KCi5jdXN0b20tYWxlcnQsCi5hbGVydCwKLnRvYXN0LAoubm90aWZpY2F0"
        "aW9uIHsKICBiYWNrZ3JvdW5kOiB2YXIoLS1zdXJmYWNlKSAhaW1wb3J0YW50OwogIGNvbG9yOiB2YXIoLS10ZXh0KSAhaW1w"
        "b3J0YW50OwogIGJvcmRlcjogMXB4IHNvbGlkIHZhcigtLWJvcmRlcikgIWltcG9ydGFudDsKICBib3JkZXItcmFkaXVzOiB2"
        "YXIoLS1yYWRpdXMtbGcpICFpbXBvcnRhbnQ7CiAgYm94LXNoYWRvdzogdmFyKC0tc2hhZG93LW1kKSAhaW1wb3J0YW50Owp9"
        "CgovKiAtLS0gQ2hyb21lIGJpdHMgLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0t"
        "LS0tLS0tICovCi5icmVhZGNydW1iLAouYnJlYWRjcnVtYiBhIHsgY29sb3I6IHZhcigtLXRleHQtbXV0ZWQpICFpbXBvcnRh"
        "bnQ7IGZvbnQtc2l6ZTogdmFyKC0tdGV4dC1zbSk7IH0KLmJyZWFkY3J1bWIgYTpob3ZlciB7IGNvbG9yOiB2YXIoLS1icmFu"
        "ZC02MDApICFpbXBvcnRhbnQ7IH0KCi50b3AtaGVhZGVyLAoudG9wYmFyLAouaGVhZGVyLAoucGFnZS1oZWFkZXIgewogIGJh"
        "Y2tncm91bmQ6IHZhcigtLXN1cmZhY2UpICFpbXBvcnRhbnQ7CiAgY29sb3I6IHZhcigtLXRleHQpICFpbXBvcnRhbnQ7CiAg"
        "Ym9yZGVyLWJvdHRvbTogMXB4IHNvbGlkIHZhcigtLWJvcmRlcikgIWltcG9ydGFudDsKfQoKLnRvcC1hdmF0YXIsCi5hdmF0"
        "YXIgewogIGJhY2tncm91bmQ6IHZhcigtLWJyYW5kLTEwMCkgIWltcG9ydGFudDsKICBjb2xvcjogdmFyKC0tYnJhbmQtNzAw"
        "KSAhaW1wb3J0YW50OwogIGJvcmRlcjogMXB4IHNvbGlkIHZhcigtLWJvcmRlcikgIWltcG9ydGFudDsKfQoKLmRyb3Bkb3du"
        "LAouZHJvcGRvd24tbWVudSwKLm1lbnUtZHJvcGRvd24gewogIGJhY2tncm91bmQ6IHZhcigtLXN1cmZhY2UpICFpbXBvcnRh"
        "bnQ7CiAgYm9yZGVyOiAxcHggc29saWQgdmFyKC0tYm9yZGVyKSAhaW1wb3J0YW50OwogIGJvcmRlci1yYWRpdXM6IHZhcigt"
        "LXJhZGl1cy1sZykgIWltcG9ydGFudDsKICBib3gtc2hhZG93OiB2YXIoLS1zaGFkb3ctbGcpICFpbXBvcnRhbnQ7CiAgY29s"
        "b3I6IHZhcigtLXRleHQpICFpbXBvcnRhbnQ7Cn0KCi5kcm9wZG93bi1pdGVtOmhvdmVyLAouZHJvcGRvd24gYTpob3ZlciB7"
        "IGJhY2tncm91bmQ6IHZhcigtLXN1cmZhY2UtaG92ZXIpICFpbXBvcnRhbnQ7IH0KCi5pbmZvLXJvdywKLmRlLXByb2ZpbGUt"
        "ZmllbGQgewogIGJvcmRlci1ib3R0b206IDFweCBzb2xpZCB2YXIoLS1ib3JkZXIpICFpbXBvcnRhbnQ7CiAgY29sb3I6IHZh"
        "cigtLXRleHQpICFpbXBvcnRhbnQ7Cn0KCi5wcm9maWxlLXNpZGViYXIgewogIGJhY2tncm91bmQ6IHZhcigtLXN1cmZhY2Up"
        "ICFpbXBvcnRhbnQ7CiAgYm9yZGVyLXJpZ2h0OiAxcHggc29saWQgdmFyKC0tYm9yZGVyKSAhaW1wb3J0YW50Owp9Cgpociwg"
        "LmRpdmlkZXIsIC5zZXBhcmF0b3IgeyBib3JkZXItY29sb3I6IHZhcigtLWJvcmRlcikgIWltcG9ydGFudDsgYmFja2dyb3Vu"
        "ZDogdmFyKC0tYm9yZGVyKSAhaW1wb3J0YW50OyB9CgovKiBNdXRlZCBoZWxwZXIgdGV4dCwgd2hlcmV2ZXIgaXQgaXMgKi8K"
        "Lm11dGVkLCAuc3VidGl0bGUsIC5oaW50LCAuaGVscGVyLCAuY2FwdGlvbiwgc21hbGwgewogIGNvbG9yOiB2YXIoLS10ZXh0"
        "LW11dGVkKSAhaW1wb3J0YW50Owp9CgovKiAtLS0gUHJvZ3Jlc3MgYmFycyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0t"
        "LS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tICovCnByb2dyZXNzLAoucHJvZ3Jlc3MsCi5wcm9ncmVzcy1iYXIsCi5iYXIt"
        "dHJhY2sgewogIGJhY2tncm91bmQ6IHZhcigtLXN1cmZhY2Utc3Vua2VuKSAhaW1wb3J0YW50OwogIGJvcmRlci1yYWRpdXM6"
        "IHZhcigtLXJhZGl1cy1mdWxsKSAhaW1wb3J0YW50OwogIG92ZXJmbG93OiBoaWRkZW47Cn0KCi5wcm9ncmVzcy1maWxsLAou"
        "YmFyLWZpbGwsCnByb2dyZXNzOjotd2Via2l0LXByb2dyZXNzLXZhbHVlIHsgYmFja2dyb3VuZDogdmFyKC0tYnJhbmQtNTAw"
        "KSAhaW1wb3J0YW50OyB9CgovKiAtLS0gUmVjaGFydHMgLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0t"
        "LS0tLS0tLS0tLS0tLS0tLS0tLS0tICovCi5yZWNoYXJ0cy1jYXJ0ZXNpYW4tZ3JpZCBsaW5lIHsgc3Ryb2tlOiB2YXIoLS1i"
        "b3JkZXIpICFpbXBvcnRhbnQ7IH0KLnJlY2hhcnRzLXRleHQsCi5yZWNoYXJ0cy1jYXJ0ZXNpYW4tYXhpcy10aWNrLXZhbHVl"
        "IHsgZmlsbDogdmFyKC0tdGV4dC1tdXRlZCkgIWltcG9ydGFudDsgfQoucmVjaGFydHMtdG9vbHRpcC13cmFwcGVyIC5yZWNo"
        "YXJ0cy1kZWZhdWx0LXRvb2x0aXAgewogIGJhY2tncm91bmQ6IHZhcigtLXN1cmZhY2UpICFpbXBvcnRhbnQ7CiAgYm9yZGVy"
        "OiAxcHggc29saWQgdmFyKC0tYm9yZGVyKSAhaW1wb3J0YW50OwogIGJvcmRlci1yYWRpdXM6IHZhcigtLXJhZGl1cy1tZCkg"
        "IWltcG9ydGFudDsKICBjb2xvcjogdmFyKC0tdGV4dCkgIWltcG9ydGFudDsKICBib3gtc2hhZG93OiB2YXIoLS1zaGFkb3ct"
        "bWQpICFpbXBvcnRhbnQ7Cn0KLnJlY2hhcnRzLWxlZ2VuZC1pdGVtLXRleHQgeyBjb2xvcjogdmFyKC0tdGV4dC1zZWNvbmRh"
        "cnkpICFpbXBvcnRhbnQ7IH0KCi8qIC0tLSByZWFjdC1kYXRlcGlja2VyIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0t"
        "LS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0gKi8KLnJlYWN0LWRhdGVwaWNrZXIgewogIGJhY2tncm91bmQ6IHZhcigtLXN1cmZh"
        "Y2UpICFpbXBvcnRhbnQ7CiAgYm9yZGVyOiAxcHggc29saWQgdmFyKC0tYm9yZGVyKSAhaW1wb3J0YW50OwogIGJvcmRlci1y"
        "YWRpdXM6IHZhcigtLXJhZGl1cy1sZykgIWltcG9ydGFudDsKICBib3gtc2hhZG93OiB2YXIoLS1zaGFkb3ctbGcpICFpbXBv"
        "cnRhbnQ7CiAgZm9udC1mYW1pbHk6IHZhcigtLWZvbnQtc2FucykgIWltcG9ydGFudDsKfQoucmVhY3QtZGF0ZXBpY2tlcl9f"
        "aGVhZGVyIHsKICBiYWNrZ3JvdW5kOiB2YXIoLS1zdXJmYWNlLXN1bmtlbikgIWltcG9ydGFudDsKICBib3JkZXItYm90dG9t"
        "OiAxcHggc29saWQgdmFyKC0tYm9yZGVyKSAhaW1wb3J0YW50Owp9Ci5yZWFjdC1kYXRlcGlja2VyX19jdXJyZW50LW1vbnRo"
        "LAoucmVhY3QtZGF0ZXBpY2tlcl9fZGF5LW5hbWUsCi5yZWFjdC1kYXRlcGlja2VyX19kYXkgeyBjb2xvcjogdmFyKC0tdGV4"
        "dCkgIWltcG9ydGFudDsgfQoucmVhY3QtZGF0ZXBpY2tlcl9fZGF5OmhvdmVyIHsgYmFja2dyb3VuZDogdmFyKC0tc3VyZmFj"
        "ZS1ob3ZlcikgIWltcG9ydGFudDsgfQoucmVhY3QtZGF0ZXBpY2tlcl9fZGF5LS1zZWxlY3RlZCwKLnJlYWN0LWRhdGVwaWNr"
        "ZXJfX2RheS0ta2V5Ym9hcmQtc2VsZWN0ZWQgewogIGJhY2tncm91bmQ6IHZhcigtLWJyYW5kLTUwMCkgIWltcG9ydGFudDsK"
        "ICBjb2xvcjogdmFyKC0tdGV4dC1vbi1icmFuZCkgIWltcG9ydGFudDsKfQoucmVhY3QtZGF0ZXBpY2tlcl9fZGF5LS1kaXNh"
        "YmxlZCB7IGNvbG9yOiB2YXIoLS10ZXh0LW11dGVkKSAhaW1wb3J0YW50OyB9CgovKiAtLS0gcmVhY3QtaG90LXRvYXN0IC0t"
        "LS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tICovCltjbGFzcyo9J2dvJ10gPiBk"
        "aXZbcm9sZT0nc3RhdHVzJ10sCi5yZWFjdC1ob3QtdG9hc3QgewogIGJhY2tncm91bmQ6IHZhcigtLXN1cmZhY2UpICFpbXBv"
        "cnRhbnQ7CiAgY29sb3I6IHZhcigtLXRleHQpICFpbXBvcnRhbnQ7CiAgYm94LXNoYWRvdzogdmFyKC0tc2hhZG93LWxnKSAh"
        "aW1wb3J0YW50Owp9CgovKiAtLS0gRm9jdXMgKyBzZWxlY3Rpb24gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0t"
        "LS0tLS0tLS0tLS0tLS0tLS0tICovCjpmb2N1cy12aXNpYmxlIHsgb3V0bGluZTogMnB4IHNvbGlkIHZhcigtLWJvcmRlci1m"
        "b2N1cyk7IG91dGxpbmUtb2Zmc2V0OiAycHg7IH0KOjpzZWxlY3Rpb24geyBiYWNrZ3JvdW5kOiB2YXIoLS1icmFuZC0yMDAp"
        "OyBjb2xvcjogdmFyKC0tdGV4dCk7IH0KCi8qIC0tLSBSZXNwb25zaXZlIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0t"
        "LS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0gKi8KQG1lZGlhIChtYXgtd2lkdGg6IDEwMjRweCkgewogIC5mb3JtLWdy"
        "aWQgeyBncmlkLXRlbXBsYXRlLWNvbHVtbnM6IHJlcGVhdChhdXRvLWZpdCwgbWlubWF4KDE4MHB4LCAxZnIpKTsgfQp9CgpA"
        "bWVkaWEgKG1heC13aWR0aDogNzY4cHgpIHsKICAvKiBTdG9wIHdpZGUgdGFibGVzIGZvcmNpbmcgdGhlIHdob2xlIHBhZ2Ug"
        "dG8gc2Nyb2xsIHNpZGV3YXlzLiAqLwogIHRhYmxlLCBbY2xhc3MqPSctdGFibGUnXSB7IGRpc3BsYXk6IGJsb2NrOyBvdmVy"
        "Zmxvdy14OiBhdXRvOyB3aGl0ZS1zcGFjZTogbm93cmFwOyB9CgogIC5tb2RhbC1ib3gsIC5tb2RhbCwgLm1vZGFsLWNvbnRl"
        "bnQgewogICAgd2lkdGg6IGNhbGMoMTAwdncgLSB2YXIoLS1zcGFjZS04KSkgIWltcG9ydGFudDsKICAgIG1heC13aWR0aDog"
        "bm9uZSAhaW1wb3J0YW50OwogICAgbWFyZ2luOiB2YXIoLS1zcGFjZS00KSAhaW1wb3J0YW50OwogIH0KCiAgLmZvcm0tZ3Jp"
        "ZCB7IGdyaWQtdGVtcGxhdGUtY29sdW1uczogMWZyOyB9CgogIGgxIHsgZm9udC1zaXplOiB2YXIoLS10ZXh0LXhsKSAhaW1w"
        "b3J0YW50OyB9CiAgaDIgeyBmb250LXNpemU6IHZhcigtLXRleHQtbGcpICFpbXBvcnRhbnQ7IH0KfQoKQG1lZGlhIChtYXgt"
        "d2lkdGg6IDY0MHB4KSB7CiAgLm1vZGFsLWhlYWRlciwgLm1vZGFsLWJvZHksIC5tb2RhbC1mb290ZXIgeyBwYWRkaW5nOiB2"
        "YXIoLS1zcGFjZS00KSAhaW1wb3J0YW50OyB9CiAgdGFibGUgdGhlYWQgdGgsIHRhYmxlIHRib2R5IHRkIHsgcGFkZGluZzog"
        "dmFyKC0tc3BhY2UtMikgdmFyKC0tc3BhY2UtMykgIWltcG9ydGFudDsgfQogIC5tb2RhbC1mb290ZXIgeyBmbGV4LWRpcmVj"
        "dGlvbjogY29sdW1uLXJldmVyc2U7IH0KICAubW9kYWwtZm9vdGVyIGJ1dHRvbiB7IHdpZHRoOiAxMDAlOyB9Cn0KCi8qIC0t"
        "LSBGbG9hdGluZyB0aGVtZSB0b2dnbGUgLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0K"
        "ICAgT25seSByZW5kZXJlZCBvbiB0aGUgc2lnbi1pbiBzY3JlZW5zLiBUb3AtcmlnaHQsIHNvIGl0IG5ldmVyIHNpdHMgb24g"
        "dGhlCiAgIGZvb3RlciBsaW5rcy4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAg"
        "ICAgICAgICovCi5hcHAtdGhlbWUtdG9nZ2xlIHsKICBwb3NpdGlvbjogZml4ZWQ7CiAgdG9wOiB2YXIoLS1zcGFjZS01KTsK"
        "ICByaWdodDogdmFyKC0tc3BhY2UtNSk7CiAgei1pbmRleDogOTk5OTsKICBkaXNwbGF5OiBncmlkOwogIHBsYWNlLWl0ZW1z"
        "OiBjZW50ZXI7CiAgd2lkdGg6IDQwcHg7CiAgaGVpZ2h0OiA0MHB4OwogIGJhY2tncm91bmQ6IHZhcigtLXN1cmZhY2UpICFp"
        "bXBvcnRhbnQ7CiAgY29sb3I6IHZhcigtLXRleHQtc2Vjb25kYXJ5KSAhaW1wb3J0YW50OwogIGJvcmRlcjogMXB4IHNvbGlk"
        "IHZhcigtLWJvcmRlcikgIWltcG9ydGFudDsKICBib3JkZXItcmFkaXVzOiB2YXIoLS1yYWRpdXMtZnVsbCkgIWltcG9ydGFu"
        "dDsKICBib3gtc2hhZG93OiB2YXIoLS1zaGFkb3ctbWQpICFpbXBvcnRhbnQ7CiAgY3Vyc29yOiBwb2ludGVyOwp9CgouYXBw"
        "LXRoZW1lLXRvZ2dsZTpob3ZlciB7IGJhY2tncm91bmQ6IHZhcigtLXN1cmZhY2UtaG92ZXIpICFpbXBvcnRhbnQ7IGNvbG9y"
        "OiB2YXIoLS10ZXh0KSAhaW1wb3J0YW50OyB9Ci5hcHAtdGhlbWUtdG9nZ2xlIHN2ZyB7IHdpZHRoOiAxOXB4OyBoZWlnaHQ6"
        "IDE5cHg7IH0K"
    ),
    "src/theme/tokens.css": (
        "LyogPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09"
        "PT09PT0NCiAgIExhIEVzZmVyYSBIUk1TIC0gZGVzaWduIHRva2Vucw0KICAgLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0t"
        "LS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0NCiAgIEV2ZXJ5IGNvbG91ciwgc2l6ZSBh"
        "bmQgc2hhZG93IGluIHRoZSBhcHAgc2hvdWxkIGNvbWUgZnJvbSB0aGlzIGZpbGUuDQogICBOZXZlciB3cml0ZSBhIHJhdyBo"
        "ZXggdmFsdWUgaW4gYSBjb21wb25lbnQgYWdhaW4gLSB1c2UgdmFyKC0tLi4uKS4NCg0KICAgTGlnaHQgYW5kIGRhcmsgYXJl"
        "IEJPVEggZGVmaW5lZCBoZXJlLiBEYXJrIGlzIG5vdCBhbiBpbnZlcnNpb246IHN1cmZhY2VzDQogICBnZXQgdGhlaXIgb3du"
        "IHZpb2xldC1sZWFuaW5nIGdyZXlzIHNvIHRoZSBicmFuZCBzdGlsbCByZWFkcyBhdCBuaWdodC4NCiAgID09PT09PT09PT09"
        "PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09ICovDQoNCi8q"
        "IC0tLSBUeXBlZmFjZSAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0t"
        "LS0gKi8NCkBpbXBvcnQgdXJsKCdodHRwczovL2ZvbnRzLmdvb2dsZWFwaXMuY29tL2NzczI/ZmFtaWx5PUludGVyOndnaHRA"
        "NDAwOzUwMDs2MDA7NzAwJmRpc3BsYXk9c3dhcCcpOw0KDQo6cm9vdCB7DQogIC8qIC0tLS0gQnJhbmQgLS0tLS0tLS0tLS0t"
        "LS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0gKi8NCiAgLS1icmFuZC01MDogICNGM0VF"
        "RkY7DQogIC0tYnJhbmQtMTAwOiAjRTZEQ0ZGOw0KICAtLWJyYW5kLTIwMDogI0NGQkNGRjsNCiAgLS1icmFuZC0zMDA6ICNC"
        "MDk0RkY7DQogIC0tYnJhbmQtNDAwOiAjOTI2OEY3Ow0KICAtLWJyYW5kLTUwMDogIzdDM0FFRDsgICAvKiBwcmltYXJ5ICov"
        "DQogIC0tYnJhbmQtNjAwOiAjNkQyOEQ5Ow0KICAtLWJyYW5kLTcwMDogIzVCMjFCNjsNCiAgLS1icmFuZC04MDA6ICM0QTFE"
        "OTY7DQoNCiAgLyogLS0tLSBBdHRlbmRhbmNlIHN0YXRlcyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0t"
        "LS0tLS0tLS0tDQogICAgIFRoZXNlIGFyZSB0aGUgYXBwJ3MgcmVhbCB2b2NhYnVsYXJ5LiBBIHBlcnNvbiBpcyBwcmVzZW50"
        "LCBsYXRlLCBhYnNlbnQsDQogICAgIG9uIGxlYXZlLCBvciBhd2FpdGluZyBhcHByb3ZhbC4gR2l2ZSBlYWNoIG9uZSBhIGZp"
        "eGVkIGNvbG91ciBhbmQgdXNlIGl0DQogICAgIGV2ZXJ5d2hlcmUgLSBkb3QsIGJhZGdlLCByb3cgc3RyaXBlLCBjaGFydCBz"
        "ZWdtZW50IC0gc28gdGhlIG1lYW5pbmcgaXMNCiAgICAgbGVhcm5lZCBvbmNlLiAgICAgICAgICAgICAgICAgICAgICAgICAg"
        "ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAqLw0KICAtLXN0YXRlLXByZXNlbnQ6ICAgICMwNTk2Njk7DQogIC0t"
        "c3RhdGUtcHJlc2VudC1iZzogI0VDRkRGNTsNCiAgLS1zdGF0ZS1sYXRlOiAgICAgICAjRDk3NzA2Ow0KICAtLXN0YXRlLWxh"
        "dGUtYmc6ICAgICNGRkZCRUI7DQogIC0tc3RhdGUtYWJzZW50OiAgICAgI0RDMjYyNjsNCiAgLS1zdGF0ZS1hYnNlbnQtYmc6"
        "ICAjRkVGMkYyOw0KICAtLXN0YXRlLWxlYXZlOiAgICAgICMwMjg0Qzc7DQogIC0tc3RhdGUtbGVhdmUtYmc6ICAgI0YwRjlG"
        "RjsNCiAgLS1zdGF0ZS1wZW5kaW5nOiAgICAjN0MzQUVEOw0KICAtLXN0YXRlLXBlbmRpbmctYmc6ICNGNUYzRkY7DQoNCiAg"
        "LyogLS0tLSBTdXJmYWNlcyAobGlnaHQpIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0t"
        "LSAqLw0KICAtLWNhbnZhczogICAgICAgICNGNkY1Rjk7ICAgLyogcGFnZSBiYWNrZ3JvdW5kIC0gZmFpbnQgdmlvbGV0IGNh"
        "c3QgKi8NCiAgLS1zdXJmYWNlOiAgICAgICAjRkZGRkZGOyAgIC8qIGNhcmRzLCBwYW5lbHMgKi8NCiAgLS1zdXJmYWNlLXN1"
        "bmtlbjojRjFFRkY2OyAgIC8qIHRhYmxlIGhlYWRlcnMsIHdlbGxzICovDQogIC0tc3VyZmFjZS1ob3ZlcjogI0ZBRjlGQzsN"
        "CiAgLS1vdmVybGF5OiAgICAgICByZ2JhKDI2LCAyMiwgMzgsIDAuNDUpOw0KDQogIC8qIC0tLS0gVGV4dCAtLS0tLS0tLS0t"
        "LS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0gKi8NCiAgLS10ZXh0OiAgICAgICAg"
        "ICAjMUExNjI2OyAgIC8qIG5lYXItYmxhY2sgd2l0aCBhIHZpb2xldCBiaWFzICovDQogIC0tdGV4dC1zZWNvbmRhcnk6IzU0"
        "NEM2MzsNCiAgLS10ZXh0LW11dGVkOiAgICAjN0Q3NTkwOw0KICAtLXRleHQtaW52ZXJzZTogICNGRkZGRkY7DQogIC0tdGV4"
        "dC1vbi1icmFuZDogI0ZGRkZGRjsNCg0KICAvKiAtLS0tIExpbmVzIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0t"
        "LS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tICovDQogIC0tYm9yZGVyOiAgICAgICAgI0U2RTNFRTsNCiAgLS1ib3JkZXIt"
        "c3Ryb25nOiAjRDJDRERFOw0KICAtLWJvcmRlci1mb2N1czogIHZhcigtLWJyYW5kLTUwMCk7DQoNCiAgLyogLS0tLSBFbGV2"
        "YXRpb24gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSAqLw0KICAtLXNo"
        "YWRvdy1zbTogMCAxcHggMnB4IHJnYmEoMjYsIDIyLCAzOCwgMC4wNik7DQogIC0tc2hhZG93LW1kOiAwIDJweCA4cHggcmdi"
        "YSgyNiwgMjIsIDM4LCAwLjA4KTsNCiAgLS1zaGFkb3ctbGc6IDAgMTJweCAzMnB4IHJnYmEoMjYsIDIyLCAzOCwgMC4xMik7"
        "DQogIC0tcmluZzogICAgICAwIDAgMCAzcHggcmdiYSgxMjQsIDU4LCAyMzcsIDAuMjgpOw0KDQogIC8qIC0tLS0gVHlwZSAt"
        "LS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0gKi8NCiAgLS1mb250"
        "LXNhbnM6ICdJbnRlcicsIHN5c3RlbS11aSwgLWFwcGxlLXN5c3RlbSwgJ1NlZ29lIFVJJywgc2Fucy1zZXJpZjsNCiAgLyog"
        "RmlndXJlcyBpbiB0YWJsZXMgYW5kIHN0YXQgY2FyZHMgbXVzdCBsaW5lIHVwIGNvbHVtbiB0byBjb2x1bW4uICovDQogIC0t"
        "Zm9udC1udW1lcmljOiAnSW50ZXInLCBzeXN0ZW0tdWksIHNhbnMtc2VyaWY7DQoNCiAgLS10ZXh0LXhzOiAgIDAuNzVyZW07"
        "ICAgIC8qIDEyIC0gY2FwdGlvbnMsIHRhYmxlIG1ldGEgKi8NCiAgLS10ZXh0LXNtOiAgIDAuODEyNXJlbTsgIC8qIDEzIC0g"
        "ZGVuc2UgdGFibGUgYm9keSAqLw0KICAtLXRleHQtYmFzZTogMC44NzVyZW07ICAgLyogMTQgLSBVSSBkZWZhdWx0ICovDQog"
        "IC0tdGV4dC1tZDogICAxcmVtOyAgICAgICAvKiAxNiAtIGJvZHkgY29weSAqLw0KICAtLXRleHQtbGc6ICAgMS4xMjVyZW07"
        "ICAgLyogMTggLSBjYXJkIHRpdGxlcyAqLw0KICAtLXRleHQteGw6ICAgMS4zNzVyZW07ICAgLyogMjIgLSBzZWN0aW9uIGhl"
        "YWRpbmdzICovDQogIC0tdGV4dC0yeGw6ICAxLjc1cmVtOyAgICAvKiAyOCAtIHBhZ2UgdGl0bGUgKi8NCiAgLS10ZXh0LTN4"
        "bDogIDIuMjVyZW07ICAgIC8qIDM2IC0gc3RhdCBmaWd1cmVzICovDQoNCiAgLS13ZWlnaHQtbm9ybWFsOiAgIDQwMDsNCiAg"
        "LS13ZWlnaHQtbWVkaXVtOiAgIDUwMDsNCiAgLS13ZWlnaHQtc2VtaWJvbGQ6IDYwMDsNCiAgLS13ZWlnaHQtYm9sZDogICAg"
        "IDcwMDsNCg0KICAtLWxlYWRpbmctdGlnaHQ6ICAxLjI7DQogIC0tbGVhZGluZy1zbnVnOiAgIDEuNDsNCiAgLS1sZWFkaW5n"
        "LW5vcm1hbDogMS42Ow0KDQogIC0tdHJhY2tpbmctdGlnaHQ6IC0wLjAyZW07ICAgLyogbGFyZ2UgaGVhZGluZ3Mgb25seSAq"
        "Lw0KICAtLXRyYWNraW5nLXdpZGU6ICAgMC4wNmVtOyAgIC8qIGV5ZWJyb3dzLCB0YWJsZSBoZWFkZXJzICovDQoNCiAgLyog"
        "LS0tLSBTcGFjaW5nICg0cHggYmFzZSkgLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSAq"
        "Lw0KICAtLXNwYWNlLTE6IDAuMjVyZW07DQogIC0tc3BhY2UtMjogMC41cmVtOw0KICAtLXNwYWNlLTM6IDAuNzVyZW07DQog"
        "IC0tc3BhY2UtNDogMXJlbTsNCiAgLS1zcGFjZS01OiAxLjI1cmVtOw0KICAtLXNwYWNlLTY6IDEuNXJlbTsNCiAgLS1zcGFj"
        "ZS04OiAycmVtOw0KICAtLXNwYWNlLTEwOiAyLjVyZW07DQogIC0tc3BhY2UtMTI6IDNyZW07DQogIC0tc3BhY2UtMTY6IDRy"
        "ZW07DQoNCiAgLyogLS0tLSBSYWRpaSAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0t"
        "LS0tLS0tLS0tLSAqLw0KICAtLXJhZGl1cy1zbTogICA2cHg7DQogIC0tcmFkaXVzLW1kOiAgIDEwcHg7DQogIC0tcmFkaXVz"
        "LWxnOiAgIDE0cHg7DQogIC0tcmFkaXVzLXhsOiAgIDIwcHg7DQogIC0tcmFkaXVzLWZ1bGw6IDk5OXB4Ow0KDQogIC8qIC0t"
        "LS0gTGF5b3V0IC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0gKi8N"
        "CiAgLS1zaWRlYmFyLXdpZHRoOiAgICAgICAgICAyNDhweDsNCiAgLS1zaWRlYmFyLXdpZHRoLWNvbGxhcHNlZDogNzJweDsN"
        "CiAgLS1oZWFkZXItaGVpZ2h0OiAgICAgICAgICAgNjRweDsNCiAgLS1jb250ZW50LW1heDogICAgICAgICAgIDE0NDBweDsN"
        "Cg0KICAvKiAtLS0tIE1vdGlvbiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0t"
        "LS0tLS0tICovDQogIC0tZWFzZTogY3ViaWMtYmV6aWVyKDAuMiwgMCwgMC4yLCAxKTsNCiAgLS1kdXJhdGlvbi1mYXN0OiAx"
        "MjBtczsNCiAgLS1kdXJhdGlvbi1iYXNlOiAyMDBtczsNCg0KICBjb2xvci1zY2hlbWU6IGxpZ2h0Ow0KfQ0KDQovKiA9PT09"
        "PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PQ0K"
        "ICAgRGFyaw0KICAgPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09"
        "PT09PT09PT09PT09PT0gKi8NCltkYXRhLXRoZW1lPSdkYXJrJ10gew0KICAtLWJyYW5kLTUwOiAgIzI0MUEzRDsNCiAgLS1i"
        "cmFuZC0xMDA6ICMyRTIxNTA7DQogIC0tYnJhbmQtMjAwOiAjM0QyQjZCOw0KICAtLWJyYW5kLTMwMDogIzZENEZDNzsNCiAg"
        "LS1icmFuZC00MDA6ICM4QjY5RTg7DQogIC0tYnJhbmQtNTAwOiAjOTU3NUY1OyAgIC8qIGxpZnRlZDogdmlvbGV0LTUwMCBp"
        "cyB0b28gZGltIG9uIGRhcmsgKi8NCiAgLS1icmFuZC02MDA6ICNBNzhCRkE7DQogIC0tYnJhbmQtNzAwOiAjQzRCNUZEOw0K"
        "ICAtLWJyYW5kLTgwMDogI0RERDZGRTsNCg0KICAtLXN0YXRlLXByZXNlbnQ6ICAgICMzNEQzOTk7DQogIC0tc3RhdGUtcHJl"
        "c2VudC1iZzogIzBDMkMyMjsNCiAgLS1zdGF0ZS1sYXRlOiAgICAgICAjRkJCRjI0Ow0KICAtLXN0YXRlLWxhdGUtYmc6ICAg"
        "ICMyRTIyMEE7DQogIC0tc3RhdGUtYWJzZW50OiAgICAgI0Y4NzE3MTsNCiAgLS1zdGF0ZS1hYnNlbnQtYmc6ICAjMzMxNjFB"
        "Ow0KICAtLXN0YXRlLWxlYXZlOiAgICAgICMzOEJERjg7DQogIC0tc3RhdGUtbGVhdmUtYmc6ICAgIzBCMjQzNDsNCiAgLS1z"
        "dGF0ZS1wZW5kaW5nOiAgICAjQTc4QkZBOw0KICAtLXN0YXRlLXBlbmRpbmctYmc6ICMyNDFBM0Q7DQoNCiAgLS1jYW52YXM6"
        "ICAgICAgICAjMTMxMDIwOw0KICAtLXN1cmZhY2U6ICAgICAgICMxQzE4MzA7DQogIC0tc3VyZmFjZS1zdW5rZW46IzI0MUYz"
        "QTsNCiAgLS1zdXJmYWNlLWhvdmVyOiAjMjYyMDQwOw0KICAtLW92ZXJsYXk6ICAgICAgIHJnYmEoMCwgMCwgMCwgMC42NSk7"
        "DQoNCiAgLS10ZXh0OiAgICAgICAgICAjRjJGMEY3Ow0KICAtLXRleHQtc2Vjb25kYXJ5OiNCNUFFQ0I7DQogIC0tdGV4dC1t"
        "dXRlZDogICAgIzg1N0RBMDsNCiAgLS10ZXh0LWludmVyc2U6ICAjMTMxMDIwOw0KICAtLXRleHQtb24tYnJhbmQ6ICMxNjEx"
        "MkI7DQoNCiAgLS1ib3JkZXI6ICAgICAgICAjMkUyODQ2Ow0KICAtLWJvcmRlci1zdHJvbmc6ICM0MjNBNjA7DQogIC0tYm9y"
        "ZGVyLWZvY3VzOiAgdmFyKC0tYnJhbmQtNTAwKTsNCg0KICAtLXNoYWRvdy1zbTogMCAxcHggMnB4IHJnYmEoMCwgMCwgMCwg"
        "MC40KTsNCiAgLS1zaGFkb3ctbWQ6IDAgMnB4IDEwcHggcmdiYSgwLCAwLCAwLCAwLjQ1KTsNCiAgLS1zaGFkb3ctbGc6IDAg"
        "MTZweCA0MHB4IHJnYmEoMCwgMCwgMCwgMC41NSk7DQogIC0tcmluZzogICAgICAwIDAgMCAzcHggcmdiYSgxNDksIDExNywg"
        "MjQ1LCAwLjQpOw0KDQogIGNvbG9yLXNjaGVtZTogZGFyazsNCn0NCg0KLyogPT09PT09PT09PT09PT09PT09PT09PT09PT09"
        "PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT0NCiAgIEJhc2UNCiAgID09PT09PT09PT09"
        "PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09ICovDQoqLA0K"
        "Kjo6YmVmb3JlLA0KKjo6YWZ0ZXIgeyBib3gtc2l6aW5nOiBib3JkZXItYm94OyB9DQoNCmh0bWwgeyAtd2Via2l0LXRleHQt"
        "c2l6ZS1hZGp1c3Q6IDEwMCU7IH0NCg0KYm9keSB7DQogIG1hcmdpbjogMDsNCiAgYmFja2dyb3VuZDogdmFyKC0tY2FudmFz"
        "KTsNCiAgY29sb3I6IHZhcigtLXRleHQpOw0KICBmb250LWZhbWlseTogdmFyKC0tZm9udC1zYW5zKTsNCiAgZm9udC1zaXpl"
        "OiB2YXIoLS10ZXh0LWJhc2UpOw0KICBsaW5lLWhlaWdodDogdmFyKC0tbGVhZGluZy1ub3JtYWwpOw0KICAtd2Via2l0LWZv"
        "bnQtc21vb3RoaW5nOiBhbnRpYWxpYXNlZDsNCiAgLW1vei1vc3gtZm9udC1zbW9vdGhpbmc6IGdyYXlzY2FsZTsNCiAgdHJh"
        "bnNpdGlvbjogYmFja2dyb3VuZC1jb2xvciB2YXIoLS1kdXJhdGlvbi1iYXNlKSB2YXIoLS1lYXNlKSwNCiAgICAgICAgICAg"
        "ICAgY29sb3IgdmFyKC0tZHVyYXRpb24tYmFzZSkgdmFyKC0tZWFzZSk7DQp9DQoNCmgxLCBoMiwgaDMsIGg0LCBoNSwgaDYg"
        "ew0KICBtYXJnaW46IDA7DQogIGNvbG9yOiB2YXIoLS10ZXh0KTsNCiAgZm9udC13ZWlnaHQ6IHZhcigtLXdlaWdodC1zZW1p"
        "Ym9sZCk7DQogIGxpbmUtaGVpZ2h0OiB2YXIoLS1sZWFkaW5nLXRpZ2h0KTsNCn0NCg0KaDEgeyBmb250LXNpemU6IHZhcigt"
        "LXRleHQtMnhsKTsgbGV0dGVyLXNwYWNpbmc6IHZhcigtLXRyYWNraW5nLXRpZ2h0KTsgfQ0KaDIgeyBmb250LXNpemU6IHZh"
        "cigtLXRleHQteGwpOyAgbGV0dGVyLXNwYWNpbmc6IHZhcigtLXRyYWNraW5nLXRpZ2h0KTsgfQ0KaDMgeyBmb250LXNpemU6"
        "IHZhcigtLXRleHQtbGcpOyB9DQpoNCB7IGZvbnQtc2l6ZTogdmFyKC0tdGV4dC1tZCk7IH0NCg0KcCB7IG1hcmdpbjogMDsg"
        "fQ0KDQphIHsNCiAgY29sb3I6IHZhcigtLWJyYW5kLTYwMCk7DQogIHRleHQtZGVjb3JhdGlvbjogbm9uZTsNCiAgdHJhbnNp"
        "dGlvbjogY29sb3IgdmFyKC0tZHVyYXRpb24tZmFzdCkgdmFyKC0tZWFzZSk7DQp9DQphOmhvdmVyIHsgY29sb3I6IHZhcigt"
        "LWJyYW5kLTUwMCk7IHRleHQtZGVjb3JhdGlvbjogdW5kZXJsaW5lOyB9DQoNCi8qIE51bWJlcnMgbGluZSB1cCBjb2x1bW4g"
        "dG8gY29sdW1uIC0gbWF0dGVycyBpbiBldmVyeSBhdHRlbmRhbmNlIHRhYmxlLiAqLw0KdGFibGUsIC50YWJ1bGFyLCBbZGF0"
        "YS1udW1lcmljXSB7DQogIGZvbnQtdmFyaWFudC1udW1lcmljOiB0YWJ1bGFyLW51bXM7DQogIGZvbnQtZmVhdHVyZS1zZXR0"
        "aW5nczogJ3RudW0nIDE7DQp9DQoNCi8qIE9uZSB2aXNpYmxlIGZvY3VzIHRyZWF0bWVudCBmb3IgdGhlIHdob2xlIGFwcC4g"
        "Ki8NCjpmb2N1cy12aXNpYmxlIHsNCiAgb3V0bGluZTogMnB4IHNvbGlkIHZhcigtLWJvcmRlci1mb2N1cyk7DQogIG91dGxp"
        "bmUtb2Zmc2V0OiAycHg7DQogIGJvcmRlci1yYWRpdXM6IHZhcigtLXJhZGl1cy1zbSk7DQp9DQoNCjo6c2VsZWN0aW9uIHsN"
        "CiAgYmFja2dyb3VuZDogdmFyKC0tYnJhbmQtMjAwKTsNCiAgY29sb3I6IHZhcigtLXRleHQpOw0KfQ0KDQovKiBTY3JvbGxi"
        "YXJzIHRoYXQgZG9uJ3QgZ2xhcmUgd2hpdGUgaW4gZGFyayBtb2RlLiAqLw0KKiB7IHNjcm9sbGJhci13aWR0aDogdGhpbjsg"
        "c2Nyb2xsYmFyLWNvbG9yOiB2YXIoLS1ib3JkZXItc3Ryb25nKSB0cmFuc3BhcmVudDsgfQ0KKjo6LXdlYmtpdC1zY3JvbGxi"
        "YXIgeyB3aWR0aDogMTBweDsgaGVpZ2h0OiAxMHB4OyB9DQoqOjotd2Via2l0LXNjcm9sbGJhci10cmFjayB7IGJhY2tncm91"
        "bmQ6IHRyYW5zcGFyZW50OyB9DQoqOjotd2Via2l0LXNjcm9sbGJhci10aHVtYiB7DQogIGJhY2tncm91bmQ6IHZhcigtLWJv"
        "cmRlci1zdHJvbmcpOw0KICBib3JkZXI6IDNweCBzb2xpZCB0cmFuc3BhcmVudDsNCiAgYmFja2dyb3VuZC1jbGlwOiBjb250"
        "ZW50LWJveDsNCiAgYm9yZGVyLXJhZGl1czogdmFyKC0tcmFkaXVzLWZ1bGwpOw0KfQ0KKjo6LXdlYmtpdC1zY3JvbGxiYXIt"
        "dGh1bWI6aG92ZXIgeyBiYWNrZ3JvdW5kLWNvbG9yOiB2YXIoLS10ZXh0LW11dGVkKTsgYmFja2dyb3VuZC1jbGlwOiBjb250"
        "ZW50LWJveDsgfQ0KDQpAbWVkaWEgKHByZWZlcnMtcmVkdWNlZC1tb3Rpb246IHJlZHVjZSkgew0KICAqLCAqOjpiZWZvcmUs"
        "ICo6OmFmdGVyIHsNCiAgICBhbmltYXRpb24tZHVyYXRpb246IDAuMDFtcyAhaW1wb3J0YW50Ow0KICAgIGFuaW1hdGlvbi1p"
        "dGVyYXRpb24tY291bnQ6IDEgIWltcG9ydGFudDsNCiAgICB0cmFuc2l0aW9uLWR1cmF0aW9uOiAwLjAxbXMgIWltcG9ydGFu"
        "dDsNCiAgICBzY3JvbGwtYmVoYXZpb3I6IGF1dG8gIWltcG9ydGFudDsNCiAgfQ0KfQ0KDQovKiBVdGlsaXR5IC0gdmlzdWFs"
        "bHkgaGlkZGVuIGJ1dCByZWFkIGJ5IHNjcmVlbiByZWFkZXJzLiAqLw0KLnNyLW9ubHkgew0KICBwb3NpdGlvbjogYWJzb2x1"
        "dGU7DQogIHdpZHRoOiAxcHg7IGhlaWdodDogMXB4Ow0KICBwYWRkaW5nOiAwOyBtYXJnaW46IC0xcHg7DQogIG92ZXJmbG93"
        "OiBoaWRkZW47DQogIGNsaXA6IHJlY3QoMCwgMCwgMCwgMCk7DQogIHdoaXRlLXNwYWNlOiBub3dyYXA7DQogIGJvcmRlcjog"
        "MDsNCn0NCg=="
    ),
}

# ---------------------------------------------------------------------------
# 1. Write the new / updated files
# ---------------------------------------------------------------------------
step("1. Design system, theme and sidebar")

written = 0
unchanged = 0

for rel, b64 in sorted(FILES.items()):
    dest = os.path.join(HERE, rel.replace("/", os.sep))
    data = base64.b64decode(b64)

    if os.path.exists(dest) and io.open(dest, "rb").read() == data:
        unchanged += 1
        continue

    backup(dest)
    os.makedirs(os.path.dirname(dest), exist_ok=True)
    io.open(dest, "wb").write(data)
    print("     + %s" % rel)
    written += 1

print("")
print("     %d written, %d already current" % (written, unchanged))


# ---------------------------------------------------------------------------
# 2. Icons -> Phosphor duotone
# ---------------------------------------------------------------------------
step("2. Icons")

FA_TO_LU = {
    "FaHome": "LuHouse", "FaUsers": "LuUsers", "FaUser": "LuUser",
    "FaUserCircle": "LuCircleUser", "FaUserPlus": "LuUserPlus",
    "FaUserMinus": "LuUserMinus", "FaUserTimes": "LuUserX",
    "FaUserCheck": "LuUserCheck", "FaUserCog": "LuUserCog",
    "FaIdCard": "LuIdCard", "FaCalendarAlt": "LuCalendar",
    "FaCalendarCheck": "LuCalendarCheck", "FaClipboardList": "LuClipboardList",
    "FaTasks": "LuListChecks", "FaTicketAlt": "LuTicket",
    "FaMoneyCheckAlt": "LuBanknote", "FaHourglassHalf": "LuHourglass",
    "FaBook": "LuBookOpen", "FaBell": "LuBell", "FaCog": "LuSettings",
    "FaSlidersH": "LuSlidersHorizontal", "FaSignOutAlt": "LuLogOut",
    "FaChevronDown": "LuChevronDown", "FaChevronUp": "LuChevronUp",
    "FaTimes": "LuX", "FaTrash": "LuTrash2", "FaEye": "LuEye",
    "FaDownload": "LuDownload",
}

LU_TO_PI = {
    "LuHouse": "PiHouseDuotone", "LuUsers": "PiUsersThreeDuotone",
    "LuUser": "PiUserDuotone", "LuCircleUser": "PiUserCircleDuotone",
    "LuUserPlus": "PiUserPlusDuotone", "LuUserMinus": "PiUserMinusDuotone",
    "LuUserX": "PiProhibitDuotone", "LuUserCheck": "PiUserCheckDuotone",
    "LuUserCog": "PiUserGearDuotone", "LuIdCard": "PiIdentificationCardDuotone",
    "LuCalendar": "PiCalendarBlankDuotone", "LuCalendarCheck": "PiCalendarCheckDuotone",
    "LuClipboardList": "PiClipboardTextDuotone", "LuListChecks": "PiListChecksDuotone",
    "LuTicket": "PiTicketDuotone", "LuBanknote": "PiCurrencyCircleDollarDuotone",
    "LuHourglass": "PiHourglassMediumDuotone", "LuBookOpen": "PiBookOpenDuotone",
    "LuBell": "PiBellDuotone", "LuSettings": "PiGearDuotone",
    "LuSlidersHorizontal": "PiSlidersHorizontalDuotone", "LuLogOut": "PiSignOutDuotone",
    "LuChevronDown": "PiCaretDownBold", "LuChevronUp": "PiCaretUpBold",
    "LuX": "PiXBold", "LuTrash2": "PiTrashDuotone", "LuEye": "PiEyeDuotone",
    "LuDownload": "PiDownloadSimpleDuotone",
}

icon_files = 0
icon_count = 0
SKIP = os.path.join("components", "sidebar", "Sidebar.jsx")

for dirpath, dirnames, filenames in os.walk(SRC):
    dirnames[:] = [d for d in dirnames if d != "node_modules"]
    for name in filenames:
        if not name.endswith(".jsx"):
            continue
        path = os.path.join(dirpath, name)
        if path.endswith(SKIP):
            continue

        text = io.open(path, encoding="utf-8", newline="").read()
        original = text
        local = 0

        if "react-icons/fa" in text:
            for a, b in FA_TO_LU.items():
                text, n = re.subn(r"\b" + a + r"\b", b, text)
                local += n
            text = text.replace("react-icons/fa", "react-icons/lu")

        if "react-icons/lu" in text:
            for a, b in LU_TO_PI.items():
                text, n = re.subn(r"\b" + a + r"\b", b, text)
                local += n
            text = text.replace("react-icons/lu", "react-icons/pi")

        if text != original:
            backup(path)
            io.open(path, "w", encoding="utf-8", newline="").write(text)
            print("     ~ %-46s %d icons" % (os.path.relpath(path, SRC), local))
            icon_files += 1
            icon_count += local

if icon_files:
    print("")
    print("     %d files, %d icons -> Phosphor duotone" % (icon_files, icon_count))
else:
    print("     already done")


# ---------------------------------------------------------------------------
# 3. Broken imports (these break `npm run build`)
# ---------------------------------------------------------------------------
step("3. Broken imports")

IMPORT_FIXES = [
    ("App.jsx", '"./pages/Login/LoginPage"', '"./pages/Login/loginPage"'),
    ("pages/TeamLeader/TLRegularization.jsx", "components/sidebar/Sidebar_tl", "components/sidebar/sidebar_tl"),
    ("pages/Profile/Profile.jsx", "components/sidebar/sidebar_emp", "components/sidebar/Sidebar_emp"),
    ("pages/Attendance/Attendance.jsx", "components/sidebar/sidebar_emp", "components/sidebar/Sidebar_emp"),
    ("pages/Dashboard/CompanyPolicies.jsx", "components/sidebar/sidebar_emp", "components/sidebar/Sidebar_emp"),
    ("pages/Dashboard/RegularizationPage.jsx", "components/sidebar/sidebar_emp", "components/sidebar/Sidebar_emp"),
    ("pages/Dashboard/LeaveApplication.jsx", "components/sidebar/sidebar_emp", "components/sidebar/Sidebar_emp"),
    ("pages/Dashboard/Tickets_emp.jsx", "components/sidebar/sidebar_emp", "components/sidebar/Sidebar_emp"),
    ("pages/Dashboard/Dashboard_emp.jsx", "components/sidebar/sidebar_emp", "components/sidebar/Sidebar_emp"),
    ("pages/Dashboard/CompanyPolicies.jsx", 'components/sidebar/sidebar"', 'components/sidebar/Sidebar"'),
    ("pages/Dashboard/DailyTaskPage.jsx", "../../components/TopHeader", "../Dashboard/TopHeader"),
    ("pages/Login/loginPage.jsx", '"./LoginPage.css"', '"./loginPage.css"'),
    ("pages/Login/OtpPage.jsx", '"./LoginPage.css"', '"./loginPage.css"'),
    ("pages/Login/ResetPassword.jsx", '"./LoginPage.css"', '"./loginPage.css"'),
]

fixed = 0
ok = 0
for rel, find, replace in IMPORT_FIXES:
    path = os.path.join(SRC, rel.replace("/", os.sep))
    if not os.path.exists(path):
        continue
    text = io.open(path, encoding="utf-8", newline="").read()
    if find not in text:
        ok += 1
        continue
    backup(path)
    io.open(path, "w", encoding="utf-8", newline="").write(text.replace(find, replace))
    print("     ~ %s" % rel)
    fixed += 1

print("")
print("     %d fixed, %d already correct" % (fixed, ok))


# ---------------------------------------------------------------------------
# 4. Check
# ---------------------------------------------------------------------------
step("4. Check")

problems = []

for rel in FILES:
    if not os.path.exists(os.path.join(HERE, rel.replace("/", os.sep))):
        problems.append("missing after write: " + rel)

main_js = io.open(os.path.join(SRC, "main.jsx"), encoding="utf-8", newline="").read()
for needle, label in [
    ("theme/tokens.css", "tokens import"),
    ("theme/app-theme.css", "retrofit import"),
    ("ThemeProvider", "theme provider"),
]:
    if needle not in main_js:
        problems.append("main.jsx is missing the " + label)

leftover = []
for dirpath, dirnames, filenames in os.walk(SRC):
    dirnames[:] = [d for d in dirnames if d != "node_modules"]
    for name in filenames:
        if name.endswith(".jsx"):
            t = io.open(os.path.join(dirpath, name), encoding="utf-8", newline="").read()
            if "react-icons/pi" in t:
                for m in re.finditer(r"\b(Fa|Lu)[A-Z][A-Za-z0-9]+\b", t):
                    leftover.append((os.path.relpath(os.path.join(dirpath, name), SRC), m.group(0)))

for f, icon in sorted(set(leftover)):
    problems.append("unmapped icon %s in %s" % (icon, f))

if problems:
    print("")
    for p in problems:
        print("     ! " + p)
    print("")
    print("     Send the lines above to Claude.")
else:
    print("     everything in place")

# ---------------------------------------------------------------------------
print("")
line("=")
if os.path.isdir(BACKUP):
    print("  Backup: %s" % os.path.basename(BACKUP))
    print("  Undo with:  python update_ui.py --undo")
else:
    print("  Nothing needed changing.")
line("=")
print("")
print("  Next:")
print("      npm run dev")
print("      then hard-refresh the browser with Ctrl+Shift+R")
print("")
print("  The sidebar has a pin button to keep it open, and a dark mode")
print("  switch at the bottom.")
print("")
