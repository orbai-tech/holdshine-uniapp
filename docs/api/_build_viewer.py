# -*- coding: utf-8 -*-
"""Build self-contained local Swagger/ReDoc pages and optionally serve them."""
from __future__ import annotations

import argparse
import json
import urllib.request
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

OUT = Path(__file__).resolve().parent
VENDOR = OUT / "vendor"


def download(url: str, dest: Path) -> None:
    dest.parent.mkdir(parents=True, exist_ok=True)
    if dest.exists() and dest.stat().st_size > 0:
        return
    print(f"downloading {url}")
    with urllib.request.urlopen(url, timeout=60) as resp:
        dest.write_bytes(resp.read())


def build() -> None:
    spec_text = (OUT / "openapi.json").read_text(encoding="utf-8")
    json.loads(spec_text)  # validate

    # Local vendor assets so pages work even if CDN is blocked
    download(
        "https://cdn.jsdelivr.net/npm/swagger-ui-dist@5.17.14/swagger-ui.css",
        VENDOR / "swagger-ui.css",
    )
    download(
        "https://cdn.jsdelivr.net/npm/swagger-ui-dist@5.17.14/swagger-ui-bundle.js",
        VENDOR / "swagger-ui-bundle.js",
    )
    download(
        "https://cdn.jsdelivr.net/npm/redoc@2.1.5/bundles/redoc.standalone.js",
        VENDOR / "redoc.standalone.js",
    )

    (OUT / "swagger-ui.html").write_text(
        f"""<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>咖啡点单系统 API - Swagger UI (local)</title>
  <link rel="stylesheet" href="./vendor/swagger-ui.css"/>
  <style>body {{ margin: 0; background: #fafafa; }}</style>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="./vendor/swagger-ui-bundle.js"></script>
  <script>
    const spec = {spec_text};
    window.ui = SwaggerUIBundle({{
      spec: spec,
      dom_id: '#swagger-ui',
      deepLinking: true,
      presets: [SwaggerUIBundle.presets.apis],
      layout: 'BaseLayout'
    }});
  </script>
</body>
</html>
""",
        encoding="utf-8",
    )

    (OUT / "redoc.html").write_text(
        f"""<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>咖啡点单系统 API - ReDoc (local)</title>
  <style>body {{ margin: 0; }}</style>
</head>
<body>
  <div id="redoc-container"></div>
  <script src="./vendor/redoc.standalone.js"></script>
  <script>
    const spec = {spec_text};
    Redoc.init(spec, {{}}, document.getElementById('redoc-container'));
  </script>
</body>
</html>
""",
        encoding="utf-8",
    )

    print(f"wrote {(OUT / 'swagger-ui.html').stat().st_size} bytes swagger-ui.html")
    print(f"wrote {(OUT / 'redoc.html').stat().st_size} bytes redoc.html")


def serve(port: int) -> None:
    class Handler(SimpleHTTPRequestHandler):
        def __init__(self, *args, **kwargs):
            super().__init__(*args, directory=str(OUT), **kwargs)

    httpd = ThreadingHTTPServer(("127.0.0.1", port), Handler)
    print(f"Serving docs at http://127.0.0.1:{port}/swagger-ui.html")
    print(f"Also available: http://127.0.0.1:{port}/redoc.html")
    print(f"Raw OpenAPI:  http://127.0.0.1:{port}/openapi.json")
    httpd.serve_forever()


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--serve", action="store_true")
    parser.add_argument("--port", type=int, default=8765)
    args = parser.parse_args()
    build()
    if args.serve:
        serve(args.port)
