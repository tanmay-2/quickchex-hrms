from app.main import app

routes = []
for r in app.routes:
    if hasattr(r, "path"):
        methods = ",".join(r.methods) if hasattr(r, "methods") and r.methods else ""
        routes.append(f"{methods:10} {r.path}")

routes.sort(key=lambda x: x.split()[1] if len(x.split()) > 1 else x)
for r in routes:
    print(r)
