#!/usr/bin/env python3
"""Validate the staged harness; optionally set declared Git executable bits.

Never stages content, regenerates manifests, executes the package, commits,
pushes, or changes worktree permissions. Run after the final scoped git add.
"""
import argparse
import hashlib
import json
import re
import subprocess
import sys
from pathlib import PurePosixPath

PACKAGE = "docs/agent-handoffs/harness"
EXCLUSIONS = {"PACKAGE.md", "TREE-MANIFEST.json"}
MAX_BLOB = 2 * 1024 * 1024


def git(*args, data=None):
    return subprocess.run(["git", *args], input=data, stdout=subprocess.PIPE,
                          stderr=subprocess.PIPE, check=True, timeout=15).stdout


def blob(oid):
    size = int(git("cat-file", "-s", oid))
    if size > MAX_BLOB:
        raise ValueError("package blob exceeds validation limit")
    return git("cat-file", "blob", oid)


def unique(pairs):
    out = {}
    for key, value in pairs:
        if key in out:
            raise ValueError("duplicate manifest key")
        out[key] = value
    return out


def safe_path(path):
    if not isinstance(path, str) or not re.fullmatch(r"[A-Za-z0-9_.\-/]+", path):
        raise ValueError("invalid manifest path")
    if str(PurePosixPath(path)) != path or path.startswith("/") or ".." in path.split("/"):
        raise ValueError("noncanonical manifest path")
    return path


def inspect(tree):
    entries = {}
    for item in git("ls-tree", "-r", "-z", tree, "--", PACKAGE).split(b"\0"):
        if not item:
            continue
        meta, path = item.decode("utf-8").split("\t", 1)
        mode, kind, oid = meta.split()
        rel = path.removeprefix(PACKAGE + "/")
        safe_path(rel)
        if kind != "blob" or mode not in {"100644", "100755"}:
            raise ValueError("package contains a nonregular entry: " + rel)
        entries[rel] = (mode, oid)
    if not EXCLUSIONS <= entries.keys():
        raise ValueError("missing package metadata")
    manifest = json.loads(blob(entries["TREE-MANIFEST.json"][1]), object_pairs_hook=unique)
    if not isinstance(manifest, dict):
        raise ValueError("manifest must be an object")
    files = manifest.get("files")
    if not isinstance(files, dict) or not 1 <= len(files) <= 128:
        raise ValueError("invalid bounded manifest")
    exclusions = manifest.get("exclusions")
    if not isinstance(exclusions, list) or len(exclusions) != 2 or set(exclusions) != EXCLUSIONS:
        raise ValueError("unsupported manifest exclusions")
    for path, spec in files.items():
        safe_path(path)
        if path in EXCLUSIONS or not isinstance(spec, dict) or set(spec) != {"sha256", "executable"}:
            raise ValueError("invalid file specification")
        if type(spec["executable"]) is not bool or not isinstance(spec["sha256"], str) or not re.fullmatch(r"[a-f0-9]{64}", spec["sha256"]):
            raise ValueError("invalid file hash or executable flag")
    errors = []
    for path in sorted(entries.keys() - files.keys() - EXCLUSIONS):
        errors.append("EXTRA " + path)
    for path in sorted(files.keys() - entries.keys()):
        errors.append("MISSING " + path)
    modes = []
    for path in sorted(files.keys() & entries.keys()):
        mode, oid = entries[path]
        spec = files[path]
        if hashlib.sha256(blob(oid)).hexdigest() != spec["sha256"]:
            errors.append("HASH " + path)
        expected = "100755" if spec["executable"] else "100644"
        if mode != expected:
            modes.append((path, expected))
    # Metadata are never executable; their authenticity must be pinned separately.
    for path in sorted(EXCLUSIONS):
        if entries[path][0] != "100644":
            errors.append("METADATA_MODE " + path)
    return errors, modes, len(files)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--apply", action="store_true", help="set only declared +x bits in the index")
    parser.add_argument("--ref", help="check an existing full commit SHA instead of the index")
    args = parser.parse_args()
    if args.ref and (args.apply or not re.fullmatch(r"[a-f0-9]{40}", args.ref)):
        raise ValueError("--ref requires a full SHA and cannot be combined with --apply")
    # Use from the repository root so pathspecs have a single meaning.
    if git("rev-parse", "--show-prefix").strip():
        raise ValueError("run from the repository root")
    tree = git("rev-parse", "--verify", args.ref + "^{commit}").decode().strip() if args.ref else git("write-tree").decode().strip()
    errors, modes, count = inspect(tree)
    if args.apply:
        branch = git("symbolic-ref", "--short", "HEAD").decode().strip()
        if branch in {"main", "master"}:
            raise ValueError("prepare modes on a task branch")
        # All non-mode checks precede writes. Never remove files or bless altered hashes.
        if errors or any(mode != "100755" for _, mode in modes):
            errors += ["MODE " + path for path, mode in modes if mode != "100755"]
        elif modes:
            git("update-index", "--chmod=+x", "--", *[PACKAGE + "/" + path for path, _ in modes])
            tree = git("write-tree").decode().strip()
            errors, modes, count = inspect(tree)
    for error in errors:
        print(error)
    for path, expected in modes:
        print("MODE " + path + " expected " + expected)
    if errors or modes:
        return 1
    print(f"PASS: {count} manifest files; exact package set, hashes and Git modes; tree {tree}")
    print("Content was not staged. Commit now; re-run after any further git add. Runtime not tested.")
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except (ValueError, OSError, TypeError, KeyError, UnicodeError, subprocess.SubprocessError):
        print("FAIL: package validation unavailable or malformed input", file=sys.stderr)
        sys.exit(1)
