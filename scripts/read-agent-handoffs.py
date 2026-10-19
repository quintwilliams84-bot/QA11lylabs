#!/usr/bin/env python3
"""Read validated task metadata. No network, commands, acknowledgments or writes."""
import argparse
import json
import os
import re
import stat
import sys

MAX_BYTES = 32768
AGENTS = {"codex", "muse", "arch", "antigravity"}
REPOSITORIES = {"quintwilliams84-bot/QA11lylabs", "quintwilliams84-bot/OpenclawOps",
                "quintwilliams84-bot/qa11ylabs-website"}


def exact_keys(value, keys):
    if not isinstance(value, dict) or set(value) != set(keys):
        raise ValueError("unexpected handoff fields")


def no_duplicates(pairs):
    result = {}
    for key, value in pairs:
        if key in result:
            raise ValueError("duplicate JSON key")
        result[key] = value
    return result


def validate(document):
    exact_keys(document, ("schema_version", "delivery", "tasks"))
    if type(document["schema_version"]) is not int or document["schema_version"] != 1:
        raise ValueError("unsupported schema")
    if document["delivery"] != "manual_read_data_only":
        raise ValueError("unsupported delivery mode")
    if not isinstance(document["tasks"], list) or len(document["tasks"]) > 32:
        raise ValueError("invalid task count")
    identities = set()
    for task in document["tasks"]:
        exact_keys(task, ("id", "target_agent", "status", "subject", "source"))
        if not isinstance(task["id"], str) or not re.fullmatch(r"[a-z][a-z0-9-]{0,63}", task["id"]):
            raise ValueError("invalid task identity")
        if task["id"] in identities:
            raise ValueError("duplicate task identity")
        identities.add(task["id"])
        if task["target_agent"] not in AGENTS:
            raise ValueError("unknown target agent")
        if task["status"] not in {"needs_revision", "ready_for_review", "blocked"}:
            raise ValueError("unsupported task status")
        if not isinstance(task["subject"], str) or not re.fullmatch(r"[A-Za-z0-9 ,.:()/+-]{1,160}", task["subject"]):
            raise ValueError("invalid subject metadata")
        source = task["source"]
        exact_keys(source, ("repository", "branch", "commit"))
        if source["repository"] not in REPOSITORIES:
            raise ValueError("repository outside collaboration scope")
        if not isinstance(source["branch"], str) or not re.fullmatch(r"[a-z0-9][a-z0-9/_-]{0,100}", source["branch"]):
            raise ValueError("invalid branch metadata")
        if not isinstance(source["commit"], str) or not re.fullmatch(r"[a-f0-9]{40}", source["commit"]):
            raise ValueError("full source commit required")
    return document


def load(path):
    fd = os.open(path, os.O_RDONLY | os.O_NOFOLLOW | os.O_NONBLOCK)
    with os.fdopen(fd, "rb") as stream:
        info = os.fstat(stream.fileno())
        if not stat.S_ISREG(info.st_mode) or info.st_size > MAX_BYTES:
            raise ValueError("expected bounded regular metadata file")
        raw = stream.read(MAX_BYTES + 1)
    if len(raw) > MAX_BYTES:
        raise ValueError("handoff file too large")
    return validate(json.loads(raw, object_pairs_hook=no_duplicates))


def select(document, agent):
    if agent not in AGENTS:
        raise ValueError("unknown reader agent")
    validate(document)
    return {"delivery": "manual_read_data_only", "authorization": "none",
            "receipt_or_acknowledgment": False,
            "tasks": [task for task in document["tasks"] if task["target_agent"] == agent]}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--file", required=True)
    parser.add_argument("--agent", choices=sorted(AGENTS), required=True)
    args = parser.parse_args()
    print(json.dumps(select(load(args.file), args.agent), indent=2))


if __name__ == "__main__":
    try:
        main()
    except (OSError, ValueError, TypeError, RecursionError):
        # Never echo untrusted metadata, paths or raw parse diagnostics.
        print("FAIL: invalid or unavailable handoff metadata", file=sys.stderr)
        sys.exit(1)
