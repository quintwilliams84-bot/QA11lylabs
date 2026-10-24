#!/usr/bin/env bash
# Repository-only checks; no fetch, package execution, delivery or deployment.
set -euo pipefail
python3 -B - <<'PY'
import ast
from pathlib import Path
for name in ('scripts/agent-inbox.py', 'scripts/prepare-harness-modes.py',
             'test/agent-workflow-tools.test.py'):
    ast.parse(Path(name).read_text(), filename=name)
PY
python3 -B scripts/read-agent-handoffs.py --file docs/agent-handoffs/index.json --agent codex >/dev/null
python3 -I -B test/agent-workflow-tools.test.py -v
