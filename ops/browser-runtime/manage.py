#!/usr/bin/env python3
"""Explicit, private browser-tool installation. Never changes the live scanner."""
import argparse
import fcntl
import hashlib
import json
import os
from pathlib import Path
import shutil
import signal
import stat
import subprocess
import sys

SOURCE = Path(__file__).resolve().parent
FILES = ("package.json", "package-lock.json", "probe.cjs")


def private_directory(path):
    if not path.is_absolute() or path == Path("/"):
        raise ValueError("runtime directory must be absolute and must not be /")
    # Reject links in every existing component; do not silently redirect writes.
    for component in reversed((path, *path.parents)):
        if component.is_symlink():
            raise ValueError("symlink in runtime path")
    if not path.exists():
        path.mkdir(mode=0o700, parents=True)
    info = path.stat()
    if not stat.S_ISDIR(info.st_mode) or info.st_uid != os.getuid():
        raise ValueError("runtime directory must be owned by the invoking user")
    if info.st_mode & 0o077:
        raise ValueError("runtime directory must have private permissions (0700)")


def child_environment(runtime):
    # No dotenv, inherited provider keys, npm auth, or production configuration.
    environment = {
        "PATH": ":".join(dict.fromkeys([
            str(Path(shutil.which(name) or "/usr/bin/" + name).parent)
            for name in ("node", "npm")])) + ":" + os.defpath,
        "HOME": str(runtime / "home"),
        "TMPDIR": str(runtime / "tmp"),
        "LANG": "C.UTF-8",
        "PLAYWRIGHT_BROWSERS_PATH": str(runtime / "browsers"),
        "NPM_CONFIG_CACHE": str(runtime / "npm-cache"),
        "NPM_CONFIG_USERCONFIG": "/dev/null",
        "NPM_CONFIG_GLOBALCONFIG": str(runtime / "home" / "empty-global.npmrc"),
        "NPM_CONFIG_REGISTRY": "https://registry.npmjs.org/",
        "NPM_CONFIG_ENGINE_STRICT": "true",
        "NPM_CONFIG_FETCH_RETRIES": "0",
        "NPM_CONFIG_FETCH_TIMEOUT": "30000",
        "CI": "1",
    }
    # Preserve the platform's transport and CA configuration, never disable trust.
    # Proxy bindings may be sensitive: pass through only, never log their values.
    for name in ("HTTPS_PROXY", "HTTP_PROXY", "ALL_PROXY", "NO_PROXY",
                 "https_proxy", "http_proxy", "all_proxy", "no_proxy",
                 "NODE_EXTRA_CA_CERTS", "SSL_CERT_FILE", "SSL_CERT_DIR"):
        if os.environ.get(name):
            environment[name] = os.environ[name]
    return environment


def run(command, runtime, seconds):
    # Kill only the session we create; retain its leader until group cleanup.
    process = subprocess.Popen(command, cwd=runtime, env=child_environment(runtime),
                               start_new_session=True)
    try:
        # waitid WNOWAIT avoids reaping/reusing the leader PID before killpg.
        import time
        deadline = time.monotonic() + seconds
        while not os.waitid(os.P_PID, process.pid, os.WEXITED | os.WNOHANG | os.WNOWAIT):
            if time.monotonic() >= deadline:
                raise TimeoutError("browser tool command exceeded its deadline")
            time.sleep(0.1)
        # Reap only after terminating any background descendants in our session.
        try:
            os.killpg(process.pid, signal.SIGKILL)
        except ProcessLookupError:
            pass
        status = process.wait()
        if status:
            raise RuntimeError("browser tool command failed; no runtime was promoted")
    except BaseException:
        # The leader has not been reaped on timeout/interruption.
        if process.returncode is None:
            # Give Playwright a chance to close its browser before hard cleanup.
            try:
                os.killpg(process.pid, signal.SIGTERM)
                grace = time.monotonic() + 5
                while time.monotonic() < grace:
                    if os.waitid(os.P_PID, process.pid, os.WEXITED | os.WNOHANG | os.WNOWAIT):
                        break
                    time.sleep(0.05)
            except ProcessLookupError:
                pass
            try:
                os.killpg(process.pid, signal.SIGKILL)
            except ProcessLookupError:
                pass
            process.wait()
        raise


def validate_sources():
    for name in FILES:
        if not (SOURCE / name).is_file() or (SOURCE / name).is_symlink():
            raise ValueError("required reviewed source missing or symlinked: " + name)
    manifest = json.loads((SOURCE / "package.json").read_text())
    lock = json.loads((SOURCE / "package-lock.json").read_text())
    if lock.get("lockfileVersion") != 3:
        raise ValueError("expected npm lockfile v3")
    if lock["packages"][""]["dependencies"] != manifest["dependencies"]:
        raise ValueError("manifest and lockfile disagree")
    for version in manifest["dependencies"].values():
        if not version or not version[0].isdigit() or any(c in version for c in "^~*<>= |"):
            raise ValueError("direct dependencies must be exact versions")
    for name, entry in lock["packages"].items():
        if name and (not entry.get("integrity") or
                     not entry.get("resolved", "").startswith("https://registry.npmjs.org/")):
            raise ValueError("lock dependency lacks registry URL or integrity: " + name)
    digest = hashlib.sha256()
    for name in FILES:
        digest.update(name.encode() + b"\0" + (SOURCE / name).read_bytes())
    return digest.hexdigest()


def prepare(runtime):
    private_directory(runtime)
    # Lock held across install + probe; a concurrent invocation must fail safely.
    lock_path = runtime / ".install.lock"
    fd = os.open(lock_path, os.O_RDWR | os.O_CREAT | os.O_NOFOLLOW, 0o600)
    lock = os.fdopen(fd, "r+")
    try:
        fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        for name in FILES:
            target = runtime / name
            if target.is_symlink():
                raise ValueError("unexpected runtime symlink")
            if target.exists() and target.read_bytes() != (SOURCE / name).read_bytes():
                raise ValueError("runtime belongs to a different revision; choose a new directory")
        for name in FILES:
            target = runtime / name
            if not target.exists():
                with target.open("xb") as stream:
                    stream.write((SOURCE / name).read_bytes())
        for name in ("home", "tmp", "npm-cache", "browsers"):
            private_directory(runtime / name)
        # npm must not pick up project configuration from an old runtime.
        if (runtime / ".npmrc").exists() or (runtime / ".npmrc").is_symlink():
            raise ValueError("unexpected project npm configuration")
        global_config = runtime / "home" / "empty-global.npmrc"
        if global_config.is_symlink() or (global_config.exists() and global_config.read_bytes()):
            raise ValueError("unexpected global npm configuration")
        if not global_config.exists():
            global_config.touch(mode=0o600, exist_ok=False)
    except BaseException:
        lock.close()
        raise
    return lock


def main():
    def interrupted(number, _frame):
        raise SystemExit(128 + number)
    signal.signal(signal.SIGTERM, interrupted)
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--runtime-dir", type=Path, required=True)
    action = parser.add_mutually_exclusive_group()
    action.add_argument("--apply", action="store_true", help="install and test; never activate a service")
    action.add_argument("--check", action="store_true", help="test an existing runtime without installing")
    args = parser.parse_args()
    if os.getuid() == 0:
        raise ValueError("run as an unprivileged development/service user, never root")
    fingerprint = validate_sources()
    runtime = args.runtime_dir
    if not runtime.is_absolute() or ".." in runtime.parts:
        raise ValueError("use an absolute runtime path without traversal")
    if runtime.is_relative_to(SOURCE.parents[1]):
        raise ValueError("runtime must be outside the repository checkout")
    if not args.apply and not args.check:
        print(json.dumps({"action": "plan-only", "fingerprint": fingerprint,
                          "runtime": str(runtime), "activation": False}))
        return
    if args.check and (not runtime.is_dir() or any(
            not (runtime / name).is_file() for name in FILES)):
        raise ValueError("runtime missing; --check never installs or creates a runtime")
    with prepare(runtime):
        if args.apply:
            run(["npm", "ci", "--ignore-scripts", "--no-audit", "--no-fund"], runtime, 300)
            # Local pinned CLI only; no npx fallback, OS installer, or global update.
            run(["node", "node_modules/playwright/cli.js", "install", "chromium"], runtime, 300)
        run(["node", "probe.cjs"], runtime, 60)
    print(json.dumps({"status": "pass", "fingerprint": fingerprint,
                      "runtime": str(runtime), "activation": False}))


if __name__ == "__main__":
    try:
        main()
    except (OSError, ValueError, RuntimeError, TimeoutError) as error:
        print("FAIL: " + str(error), file=sys.stderr)
        sys.exit(1)
