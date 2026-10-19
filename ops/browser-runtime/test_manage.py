import importlib.util
import hashlib
import json
import os
from pathlib import Path
import signal
import subprocess
import sys
import tempfile
import time
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location("browser_manage", ROOT / "manage.py")
manage = importlib.util.module_from_spec(spec)
spec.loader.exec_module(manage)


class RuntimeTests(unittest.TestCase):
    def assert_stopped(self, pid):
        # SIGKILL delivery is asynchronous; allow a bounded scheduling interval.
        status = Path(f"/proc/{pid}/stat")
        deadline = time.monotonic() + 2
        while time.monotonic() < deadline:
            try:
                if status.read_text().split()[2] == "Z":
                    return
            except FileNotFoundError:
                return
            time.sleep(0.01)
        self.fail("owned child remained executable after cleanup")

    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.runtime = self.root / "runtime"

    def test_real_lockfile_matches_exact_manifest_and_integrities(self):
        self.assertEqual(len(manage.validate_sources()), 64)

    def test_missing_lock_fails(self):
        with patch.object(manage, "SOURCE", self.root):
            with self.assertRaisesRegex(ValueError, "missing"):
                manage.validate_sources()

    def test_installer_changes_affect_fingerprint(self):
        before = manage.validate_sources()
        for name in manage.FILES:
            (self.root / name).write_bytes((ROOT / name).read_bytes())
        with (self.root / "manage.py").open("a") as stream:
            stream.write("\n# synthetic installer revision\n")
        with patch.object(manage, "SOURCE", self.root):
            self.assertNotEqual(before, manage.validate_sources())

    def snapshot(self):
        return {str(path.relative_to(self.runtime)): (path.stat().st_mode,
                path.stat().st_mtime_ns, path.read_bytes() if path.is_file() else None)
                for path in [self.runtime, *self.runtime.rglob('*')]}

    def make_metadata_runtime(self):
        with manage.prepare(self.runtime):
            pass
        packages = json.loads((ROOT / "package.json").read_text())["dependencies"]
        for name, version in packages.items():
            target = self.runtime / "node_modules" / name / "package.json"
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_text(json.dumps({"version": version}))

    def test_check_success_is_read_only_and_does_not_claim_browser_health(self):
        self.make_metadata_runtime()
        before = self.snapshot()
        result = subprocess.run([sys.executable, str(ROOT / "manage.py"), "--check",
                                 "--runtime-dir", str(self.runtime)], capture_output=True, text=True)
        self.assertEqual(result.returncode, 0, result.stderr)
        report = json.loads(result.stdout)
        self.assertEqual(report["status"], "metadata-pass")
        self.assertFalse(report["browser_verified"])
        self.assertEqual(len(report["source_commit"]), 40)
        self.assertEqual(report["installer_sha256"], hashlib.sha256((ROOT / "manage.py").read_bytes()).hexdigest())
        self.assertEqual(before, self.snapshot())

    def test_failed_check_does_not_repair_or_write_runtime(self):
        self.make_metadata_runtime()
        (self.runtime / "probe.cjs").write_text("unexpected edit")
        before = self.snapshot()
        result = subprocess.run([sys.executable, str(ROOT / "manage.py"), "--check",
                                 "--runtime-dir", str(self.runtime)], capture_output=True, text=True)
        self.assertNotEqual(result.returncode, 0)
        self.assertEqual(before, self.snapshot())

    def test_check_missing_lock_does_not_recreate_it(self):
        self.make_metadata_runtime()
        (self.runtime / ".install.lock").unlink()
        before = self.snapshot()
        with self.assertRaises(FileNotFoundError):
            manage.existing_runtime(self.runtime)
        self.assertEqual(before, self.snapshot())

    def test_functional_probe_lock_rejects_concurrent_access(self):
        self.make_metadata_runtime()
        with manage.existing_runtime(self.runtime, exclusive=True):
            with self.assertRaises(BlockingIOError):
                manage.existing_runtime(self.runtime, exclusive=True)
        with manage.existing_runtime(self.runtime):
            pass

    def test_probe_without_namespace_fails_before_loading_playwright(self):
        environment = manage.child_environment(self.runtime)
        environment.pop("QA11Y_PARENT_NETNS", None)
        result = subprocess.run(["node", str(ROOT / "probe.cjs")], env=environment,
                                capture_output=True, text=True)
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("namespace isolation required", result.stderr)

    def test_probe_cannot_use_current_host_namespaces(self):
        environment = manage.child_environment(self.runtime, isolated=True)
        self.assertNotIn("HTTPS_PROXY", environment)
        result = subprocess.run(["node", str(ROOT / "probe.cjs")], env=environment,
                                capture_output=True, text=True)
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("namespace isolation required", result.stderr)

    def test_no_namespace_launcher_has_no_fallback(self):
        with patch.object(manage.shutil, "which", return_value=None):
            with self.assertRaisesRegex(ValueError, "unshare unavailable"):
                manage.isolated_probe_command()

    def test_lock_mismatch_fails(self):
        for name in manage.FILES:
            (self.root / name).write_bytes((ROOT / name).read_bytes())
        lock = json.loads((self.root / "package-lock.json").read_text())
        lock["packages"][""]["dependencies"]["playwright"] = "0.0.0"
        (self.root / "package-lock.json").write_text(json.dumps(lock))
        with patch.object(manage, "SOURCE", self.root):
            with self.assertRaisesRegex(ValueError, "disagree"):
                manage.validate_sources()

    def test_private_directory_rejects_public_permissions(self):
        self.runtime.mkdir(mode=0o755)
        self.runtime.chmod(0o755)
        with self.assertRaisesRegex(ValueError, "private"):
            manage.private_directory(self.runtime)

    def test_rejects_parent_symlink(self):
        (self.root / "link").symlink_to(self.root, target_is_directory=True)
        with self.assertRaisesRegex(ValueError, "symlink"):
            manage.private_directory(self.root / "link" / "child")

    def test_prepare_twice_preserves_files(self):
        with manage.prepare(self.runtime):
            before = {n: (self.runtime / n).stat().st_mtime_ns for n in manage.FILES}
        with manage.prepare(self.runtime):
            self.assertEqual(before, {n: (self.runtime / n).stat().st_mtime_ns for n in manage.FILES})

    def test_concurrent_installer_fails(self):
        with manage.prepare(self.runtime):
            with self.assertRaises(BlockingIOError):
                manage.prepare(self.runtime)

    def test_unknown_revision_is_preserved(self):
        with manage.prepare(self.runtime):
            pass
        (self.runtime / "package.json").write_text("unexpected edit")
        with self.assertRaisesRegex(ValueError, "different revision"):
            manage.prepare(self.runtime)
        self.assertEqual((self.runtime / "package.json").read_text(), "unexpected edit")

    def test_provider_credentials_and_security_overrides_not_inherited(self):
        with patch.dict(os.environ, {"AGENTMAIL_API_KEY": "synthetic-not-a-real-key",
                                    "NODE_TLS_REJECT_UNAUTHORIZED": "0",
                                    "NODE_OPTIONS": "--require=untrusted.cjs"}):
            child = manage.child_environment(self.runtime)
        for name in ("AGENTMAIL_API_KEY", "NODE_TLS_REJECT_UNAUTHORIZED", "NODE_OPTIONS"):
            self.assertNotIn(name, child)
        self.assertEqual(child["PLAYWRIGHT_BROWSERS_PATH"], str(self.runtime / "browsers"))

    def test_platform_transport_and_certificate_settings_preserved(self):
        with patch.dict(os.environ, {"HTTPS_PROXY": "http://synthetic-proxy.invalid:8080",
                                    "NODE_EXTRA_CA_CERTS": "/synthetic/ca.pem"}):
            child = manage.child_environment(self.runtime)
        self.assertEqual(child["HTTPS_PROXY"], "http://synthetic-proxy.invalid:8080")
        self.assertEqual(child["NODE_EXTRA_CA_CERTS"], "/synthetic/ca.pem")

    def test_project_npm_configuration_rejected(self):
        with manage.prepare(self.runtime):
            pass
        (self.runtime / ".npmrc").write_text("ignore-scripts=false\n")
        with self.assertRaisesRegex(ValueError, "project npm"):
            manage.prepare(self.runtime)

    def test_default_plan_creates_nothing(self):
        result = subprocess.run([sys.executable, str(ROOT / "manage.py"),
                                 "--runtime-dir", str(self.runtime)], capture_output=True, text=True)
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(json.loads(result.stdout)["action"], "plan-only")
        self.assertFalse(self.runtime.exists())

    def test_check_does_not_install_missing_runtime(self):
        result = subprocess.run([sys.executable, str(ROOT / "manage.py"), "--check",
                                 "--runtime-dir", str(self.runtime)], capture_output=True, text=True)
        self.assertNotEqual(result.returncode, 0)
        self.assertFalse(self.runtime.exists())

    def test_command_failure_is_not_success(self):
        with manage.prepare(self.runtime):
            with self.assertRaises(RuntimeError):
                manage.run([sys.executable, "-c", "raise SystemExit(7)"], self.runtime, 3)

    def test_timeout_kills_owned_descendants(self):
        with manage.prepare(self.runtime):
            unrelated = subprocess.Popen([sys.executable, "-c", "import time;time.sleep(30)"])
            self.addCleanup(lambda: (unrelated.kill(), unrelated.wait()) if unrelated.poll() is None else None)
            code = ("import subprocess,sys,time; "
                    "p=subprocess.Popen([sys.executable,'-c','import time;time.sleep(60)']); "
                    "open('child.pid','w').write(str(p.pid)); time.sleep(60)")
            with self.assertRaises(TimeoutError):
                manage.run([sys.executable, "-c", code], self.runtime, 1)
            pid = int((self.runtime / "child.pid").read_text())
            # An orphan zombie cannot execute; container init may reap later.
            self.assert_stopped(pid)
            self.assertIsNone(unrelated.poll())

    def test_normal_exit_does_not_leave_background_children(self):
        with manage.prepare(self.runtime):
            code = ("import subprocess,sys; "
                    "p=subprocess.Popen([sys.executable,'-c','import time;time.sleep(60)']); "
                    "open('child.pid','w').write(str(p.pid))")
            manage.run([sys.executable, "-c", code], self.runtime, 3)
            pid = int((self.runtime / "child.pid").read_text())
            self.assert_stopped(pid)


if __name__ == "__main__":
    unittest.main()
