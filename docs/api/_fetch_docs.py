# -*- coding: utf-8 -*-
"""Fetch and materialize local API docs from FastAPI /docs."""
from __future__ import annotations

import hashlib
import json
import urllib.request
from datetime import datetime, timedelta, timezone
from pathlib import Path

OUT = Path(__file__).resolve().parent
SOURCE_OPENAPI = "http://192.168.10.186:8001/openapi.json"
SOURCE_DOCS = "http://192.168.10.186:8001/docs"


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)

    with urllib.request.urlopen(SOURCE_OPENAPI, timeout=30) as resp:
        raw = resp.read()

    data = json.loads(raw.decode("utf-8"))

    # Pretty UTF-8 OpenAPI
    openapi_path = OUT / "openapi.json"
    pretty = json.dumps(data, ensure_ascii=False, indent=2) + "\n"
    openapi_path.write_text(pretty, encoding="utf-8")
    pretty_bytes = openapi_path.read_bytes()
    sha = hashlib.sha256(pretty_bytes).hexdigest()

    tz = timezone(timedelta(hours=8))
    now = datetime.now(tz).strftime("%Y-%m-%d %H:%M:%S %z")

    # Markdown index
    lines: list[str] = [
        "# 咖啡点单系统 API（本地副本）",
        "",
        f"> 自 `{SOURCE_DOCS}` 拉取的机器可读契约与路径索引。",
        "",
        "## 元信息",
        "",
        "| 项 | 值 |",
        "| --- | --- |",
        f"| 文档标题 | {data['info']['title']} |",
        f"| 版本号 | `{data['info'].get('version', '')}` |",
        f"| OpenAPI | `{data.get('openapi', '')}` |",
        f"| 来源 URL | {SOURCE_DOCS} |",
        f"| 机器可读 | {SOURCE_OPENAPI} |",
        "| 本地文件 | `docs/api/openapi.json` |",
        f"| SHA-256（格式化后） | `{sha}` |",
        f"| Content-Length | {len(pretty_bytes)} |",
        f"| 拉取时间 | {now} |",
        f"| 路径数 | {len(data['paths'])} |",
        "",
    ]

    desc = (data["info"].get("description") or "").strip()
    if desc:
        lines.extend(["## 文档自述", "", desc, ""])

    servers = data.get("servers") or []
    if servers:
        lines.append("## Servers")
        lines.append("")
        for s in servers:
            lines.append(f"- `{s.get('url', '')}` {s.get('description', '')}".rstrip())
        lines.append("")

    tag_map = {t.get("name"): t.get("description", "") for t in data.get("tags") or []}
    ops_by_tag: dict[str, list[tuple[str, str, str, str]]] = {k: [] for k in tag_map}
    ops_by_tag.setdefault("_untagged", [])

    for path, methods in sorted(data["paths"].items()):
        for method, op in methods.items():
            if method.startswith("x-") or not isinstance(op, dict):
                continue
            if method not in (
                "get",
                "post",
                "put",
                "patch",
                "delete",
                "head",
                "options",
                "trace",
            ):
                continue
            tags = op.get("tags") or ["_untagged"]
            summary = op.get("summary") or op.get("operationId") or ""
            op_id = op.get("operationId") or ""
            for tag in tags:
                ops_by_tag.setdefault(tag, []).append(
                    (method.upper(), path, str(summary), op_id)
                )

    lines.append("## 接口索引（按 Tag）")
    lines.append("")
    ordered_tags = list(tag_map.keys())
    if ops_by_tag.get("_untagged"):
        ordered_tags.append("_untagged")

    for tag in ordered_tags:
        items = ops_by_tag.get(tag) or []
        if not items:
            continue
        desc_t = tag_map.get(tag) or ""
        lines.append(f"### {tag}" + (f" — {desc_t}" if desc_t else ""))
        lines.append("")
        lines.append("| Method | Path | Summary | operationId |")
        lines.append("| --- | --- | --- | --- |")
        for method, path, summary, op_id in items:
            summary_esc = summary.replace("|", "\\|").replace("\n", " ")
            lines.append(f"| `{method}` | `{path}` | {summary_esc} | `{op_id}` |")
        lines.append("")

    (OUT / "API.md").write_text("\n".join(lines) + "\n", encoding="utf-8")

    (OUT / "swagger-ui.html").write_text(
        """<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>咖啡点单系统 API - Swagger UI (local)</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui.css"/>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
  <script>
    window.ui = SwaggerUIBundle({
      url: './openapi.json',
      dom_id: '#swagger-ui',
      deepLinking: true,
      presets: [SwaggerUIBundle.presets.apis],
      layout: 'BaseLayout'
    });
  </script>
</body>
</html>
""",
        encoding="utf-8",
    )

    (OUT / "redoc.html").write_text(
        """<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>咖啡点单系统 API - ReDoc (local)</title>
</head>
<body>
  <redoc spec-url="./openapi.json"></redoc>
  <script src="https://cdn.jsdelivr.net/npm/redoc@2/bundles/redoc.standalone.js"></script>
</body>
</html>
""",
        encoding="utf-8",
    )

    meta = {
        "source_docs": SOURCE_DOCS,
        "source_openapi": SOURCE_OPENAPI,
        "title": data["info"]["title"],
        "version": data["info"].get("version"),
        "openapi": data.get("openapi"),
        "paths": len(data["paths"]),
        "sha256": sha,
        "content_length": len(pretty_bytes),
        "fetched_at": now,
        "local_files": [
            "openapi.json",
            "API.md",
            "swagger-ui.html",
            "redoc.html",
            "SOURCE.json",
        ],
    }
    (OUT / "SOURCE.json").write_text(
        json.dumps(meta, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )

    (OUT / "_fetch_ok.txt").write_text(
        f"ok paths={len(data['paths'])} sha={sha} len={len(pretty_bytes)}\n",
        encoding="ascii",
        errors="ignore",
    )


if __name__ == "__main__":
    main()
