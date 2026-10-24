#!/usr/bin/env python3
"""Validate bounded v1 evidence-return data; no execution, routing or approval.

Producer names identify attributed provenance only. A valid file is neither
authenticated evidence nor permission; never put client data or secrets here.
"""
import argparse
import json
import os
import re
import stat
import sys

MAX_BYTES = 65536
PRODUCERS = {"arch", "codex", "muse", "antigravity", "hermes", "perplexity"}
REPOSITORIES = {"quintwilliams84-bot/QA11lylabs", "quintwilliams84-bot/OpenclawOps",
                "quintwilliams84-bot/qa11ylabs-website"}
RESULTS = {"PASS", "FAIL", "BLOCKED", "UNKNOWN", "NOT RUN"}
PATH = r"(?!\.{1,2}(?:/|$))[A-Za-z0-9_.-]+(?:/(?!\.{1,2}(?:/|$))[A-Za-z0-9_.-]+)*"


def exact_keys(value, keys):
    if not isinstance(value, dict) or set(value) != set(keys):
        raise ValueError("unexpected fields")


def no_duplicates(pairs):
    result = {}
    for key, value in pairs:
        if key in result:
            raise ValueError("duplicate key")
        result[key] = value
    return result


def text(value, maximum):
    if not isinstance(value, str) or not 1 <= len(value) <= maximum or not re.fullmatch(r"[ -~]+", value):
        raise ValueError("invalid bounded printable text")


def path(value):
    text(value, 240)
    if not re.fullmatch(PATH, value):
        raise ValueError("invalid repository-relative path")


def evidence_ref(value):
    text(value, 512)
    if value == "NOT AVAILABLE":
        return
    if value.startswith("https://github.com/"):
        prefix = "https://github.com/"
        for repo in REPOSITORIES:
            base = prefix + repo + "/"
            if value.startswith(base):
                suffix = value[len(base):]
                if re.fullmatch(r"commit/[a-f0-9]{40}", suffix):
                    return
                match = re.fullmatch(r"blob/([a-f0-9]{40})/(.+)", suffix)
                if match:
                    path(match.group(2))
                    return
        raise ValueError("unsupported evidence URL")
    path(value)


def validate(document):
    exact_keys(document, ("schema_version", "task_id", "producer", "source", "changed_paths",
                          "scope_summary", "checks", "blockers", "next_owner", "next_action", "authorization"))
    if type(document["schema_version"]) is not int or document["schema_version"] != 1:
        raise ValueError("unsupported version")
    if document["authorization"] != "none" or document["producer"] not in PRODUCERS:
        raise ValueError("invalid producer or authority")
    if not isinstance(document["task_id"], str) or not re.fullmatch(r"[a-z][a-z0-9-]{0,63}", document["task_id"]):
        raise ValueError("invalid task identity")
    source = document["source"]
    exact_keys(source, ("repository", "branch", "commit"))
    if source["repository"] not in REPOSITORIES:
        raise ValueError("unsupported repository")
    if not isinstance(source["branch"], str) or not re.fullmatch(r"[a-z0-9][a-z0-9/_-]{0,100}", source["branch"]):
        raise ValueError("invalid branch")
    if not isinstance(source["commit"], str) or not re.fullmatch(r"[a-f0-9]{40}", source["commit"]):
        raise ValueError("full source SHA required")
    paths = document["changed_paths"]
    if not isinstance(paths, list) or len(paths) > 32:
        raise ValueError("invalid changed paths")
    for item in paths:
        path(item)
    if len(set(paths)) != len(paths):
        raise ValueError("duplicate changed path")
    text(document["scope_summary"], 320)
    checks = document["checks"]
    if not isinstance(checks, list) or not 1 <= len(checks) <= 32:
        raise ValueError("invalid checks")
    for check in checks:
        exact_keys(check, ("name", "result", "evidence_ref", "summary"))
        text(check["name"], 80)
        if check["result"] not in RESULTS:
            raise ValueError("invalid check result")
        evidence_ref(check["evidence_ref"])
        text(check["summary"], 320)
    blockers = document["blockers"]
    if not isinstance(blockers, list) or len(blockers) > 16:
        raise ValueError("invalid blockers")
    for item in blockers:
        text(item, 160)
    if document["next_owner"] not in PRODUCERS | {"q"}:
        raise ValueError("invalid next owner")
    text(document["next_action"], 320)
    return document


def load(filename):
    fd = os.open(filename, os.O_RDONLY | os.O_NOFOLLOW | os.O_NONBLOCK)
    with os.fdopen(fd, "rb") as stream:
        info = os.fstat(stream.fileno())
        if not stat.S_ISREG(info.st_mode) or info.st_size > MAX_BYTES:
            raise ValueError("expected bounded regular file")
        raw = stream.read(MAX_BYTES + 1)
    if len(raw) > MAX_BYTES:
        raise ValueError("oversized return")
    return validate(json.loads(raw.decode("utf-8"), object_pairs_hook=no_duplicates))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--file", required=True)
    args = parser.parse_args()
    load(args.file)
    print("PASS: valid v1 evidence return; authorization none")


if __name__ == "__main__":
    try:
        main()
    except (OSError, ValueError, TypeError, RecursionError):
        print("FAIL: invalid or unavailable evidence return", file=sys.stderr)
        sys.exit(1)
