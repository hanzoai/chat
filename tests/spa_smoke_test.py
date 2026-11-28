import json
from pathlib import Path


def test_chat_spa_manifests_valid():
    root = Path(__file__).resolve().parent.parent
    pkg = json.loads((root / "package.json").read_text(encoding="utf-8"))
    assert "name" in pkg
    assert (root / "index.html").exists()
    assert (root / "vite.config.ts").exists()
    assert (root / "hanzo.yml").exists()
