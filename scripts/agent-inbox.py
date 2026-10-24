#!/usr/bin/env python3
"""Read canonical task metadata from Git without checking out or executing it.

--fetch explicitly fetches only the canonical branch using existing origin
access. No notification, acknowledgment, dispatch, commit or push is performed.
"""
import argparse
import importlib.util
import json
import re
import subprocess
import sys
from pathlib import Path

BRANCH = "codex/staging-coordination"
INDEX = "docs/agent-handoffs/index.json"
REPO = "quintwilliams84-bot/QA11lylabs"
ALLOWED_ORIGINS = {f"https://github.com/{REPO}", f"https://github.com/{REPO}.git",
                   f"git@github.com:{REPO}", f"git@github.com:{REPO}.git"}


def git(*args):
    return subprocess.run(["git", *args], stdout=subprocess.PIPE, stderr=subprocess.PIPE,
                          check=True, timeout=30).stdout


def reader():
    # This is the reviewed local reader, never code loaded from FETCH_HEAD.
    path = Path(__file__).resolve().with_name("read-agent-handoffs.py")
    spec = importlib.util.spec_from_file_location("handoff_reader", path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def document(sha, validator):
    oid = git("rev-parse", sha + ":" + INDEX).decode().strip()
    if int(git("cat-file", "-s", oid)) > validator.MAX_BYTES:
        raise ValueError("oversized task metadata")
    # Bind the metadata path to a normal file, not a symlink or submodule.
    entry = git("ls-tree", sha, "--", INDEX).decode()
    if not entry.startswith("100644 blob "):
        raise ValueError("invalid task metadata type")
    return validator.validate(json.loads(git("cat-file", "blob", oid),
                                         object_pairs_hook=validator.no_duplicates))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--agent", required=True, choices=["arch", "codex", "muse", "antigravity"])
    source = parser.add_mutually_exclusive_group()
    source.add_argument("--fetch", action="store_true")
    source.add_argument("--ref", help="full already-fetched commit SHA")
    parser.add_argument("--since", help="full previous snapshot SHA; show changes/removals only")
    args = parser.parse_args()
    for value in (args.ref, args.since):
        if value is not None and not re.fullmatch(r"[a-f0-9]{40}", value):
            raise ValueError("full snapshot SHA required")
    if git("rev-parse", "--show-prefix").strip():
        raise ValueError("run from the repository root")
    if args.fetch:
        # Identify the logical repo; Git's configured transport rewrites/SSH
        # settings remain trusted local configuration (including test mirrors).
        origin = git("config", "--get", "remote.origin.url").decode().strip()
        if origin not in ALLOWED_ORIGINS:
            raise ValueError("origin is not the canonical repository")
        git("fetch", "--no-tags", "--no-recurse-submodules", "origin", "refs/heads/" + BRANCH)
        ref = "FETCH_HEAD"
    else:
        ref = args.ref or "refs/remotes/origin/" + BRANCH
    sha = git("rev-parse", "--verify", ref + "^{commit}").decode().strip()
    validator = reader()
    current = document(sha, validator)
    selected = validator.select(current, args.agent)["tasks"]
    removed = []
    if args.since:
        previous = document(args.since, validator)
        old = {t["id"]: t for t in previous["tasks"] if t["target_agent"] == args.agent}
        now = {t["id"]: t for t in selected}
        selected = [t for t in selected if old.get(t["id"]) != t]
        removed = sorted(old.keys() - now.keys())
    print(json.dumps({"snapshot": sha, "repository": REPO, "branch": BRANCH,
                      "authorization": "none", "receipt_or_acknowledgment": False,
                      "tasks": selected, "removed_or_reassigned_task_ids": removed}, indent=2))
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except (ValueError, OSError, TypeError, KeyError, UnicodeError, RecursionError, subprocess.SubprocessError):
        # Do not echo remote errors, credentials or untrusted metadata on failure.
        print("FAIL: canonical inbox unavailable or invalid; previous state is unchanged", file=sys.stderr)
        sys.exit(1)
