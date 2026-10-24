"""Disposable local Git tests. No network, Docker, systemd, delivery or deployment."""
import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]
PREPARE = ROOT / "scripts/prepare-harness-modes.py"
INBOX = ROOT / "scripts/agent-inbox.py"
PKG = "docs/agent-handoffs/harness"


class Tools(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.repo = Path(self.tmp.name)
        self.git("init", "-q", "-b", "codex/test")
        self.git("config", "user.name", "Local Test")
        self.git("config", "user.email", "test@example.invalid")
        self.git("config", "core.hooksPath", "/dev/null")
        self.git("config", "commit.gpgsign", "false")
        self.git("config", "core.filemode", "false")
        self.write(PKG + "/run.sh", "#!/bin/sh\nexit 0\n")
        self.write(PKG + "/data.json", "{}\n")
        self.write(PKG + "/PACKAGE.md", "Local test package\n")
        self.manifest = {"exclusions": ["PACKAGE.md", "TREE-MANIFEST.json"], "files": {
            "run.sh": {"sha256": hashlib.sha256(b"#!/bin/sh\nexit 0\n").hexdigest(), "executable": True},
            "data.json": {"sha256": hashlib.sha256(b"{}\n").hexdigest(), "executable": False}}}
        self.write_manifest()
        self.task = {"id": "existing-task", "target_agent": "muse", "status": "ready_for_review",
                     "subject": "Review existing candidate", "source": {
                         "repository": "quintwilliams84-bot/QA11lylabs",
                         "branch": "codex/staging-coordination", "commit": "a" * 40}}
        self.queue = {"schema_version": 1, "delivery": "manual_read_data_only", "tasks": [self.task]}
        self.write_queue()
        self.git("add", "--all")
        self.git("commit", "-qm", "fixture")
        self.base = self.git("rev-parse", "HEAD").stdout.decode().strip()

    def git(self, *args):
        return subprocess.run(["git", *args], cwd=self.repo, stdout=subprocess.PIPE,
                              stderr=subprocess.PIPE, check=True, timeout=10)

    def write(self, path, text):
        file = self.repo / path
        file.parent.mkdir(parents=True, exist_ok=True)
        file.write_text(text)

    def write_manifest(self):
        self.write(PKG + "/TREE-MANIFEST.json", json.dumps(self.manifest))

    def write_queue(self):
        self.write("docs/agent-handoffs/index.json", json.dumps(self.queue))

    def tool(self, script, *args):
        return subprocess.run([sys.executable, "-B", str(script), *args], cwd=self.repo,
                              stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=15)

    def prepare(self, *args):
        return self.tool(PREPARE, *args)

    def inbox(self, *args):
        return self.tool(INBOX, "--agent", "muse", *args)

    def staged_tree(self):
        return self.git("write-tree").stdout

    def assert_unchanged_failure(self):
        before = self.staged_tree()
        self.assertNotEqual(self.prepare("--apply").returncode, 0)
        self.assertEqual(before, self.staged_tree())

    def test_apply_preserves_blobs_unrelated_staged_content_and_worktree_modes(self):
        self.write("unrelated.txt", "keep\n")
        self.git("add", "--", "unrelated.txt")
        before = self.git("ls-files", "-s").stdout.decode().splitlines()
        mode = os.stat(self.repo / PKG / "run.sh").st_mode
        self.assertEqual(self.prepare("--apply").returncode, 0)
        self.assertEqual(self.prepare().returncode, 0)
        after = self.git("ls-files", "-s").stdout.decode().splitlines()
        self.assertEqual([x[7:] for x in before], [x[7:] for x in after])
        self.assertEqual(mode, os.stat(self.repo / PKG / "run.sh").st_mode)
        self.assertEqual(self.git("show", ":unrelated.txt").stdout, b"keep\n")

    def test_committed_tree_check_retains_mode(self):
        self.assertNotEqual(self.prepare().returncode, 0)
        self.assertEqual(self.prepare("--apply").returncode, 0)
        self.git("commit", "-qm", "modes")
        sha = self.git("rev-parse", "HEAD").stdout.decode().strip()
        self.assertEqual(self.prepare("--ref", sha).returncode, 0)
        self.assertIn(b"100755 blob", self.git("ls-tree", "HEAD", "--", PKG + "/run.sh").stdout)

    def test_altered_content_blocks_before_mode_write(self):
        self.write(PKG + "/run.sh", "changed\n")
        self.git("add", "--", PKG + "/run.sh")
        self.assert_unchanged_failure()

    def test_extra_historical_or_code_file_is_not_deleted_or_blessed(self):
        self.write(PKG + "/old-results.txt", "history\n")
        self.git("add", "--", PKG + "/old-results.txt")
        self.assert_unchanged_failure()
        self.assertEqual((self.repo / PKG / "old-results.txt").read_text(), "history\n")

    def test_missing_manifest_file_blocks(self):
        self.git("rm", "-q", "--", PKG + "/data.json")
        self.assert_unchanged_failure()

    def test_symlink_blocks(self):
        path = self.repo / PKG / "run.sh"
        path.unlink()
        path.symlink_to("data.json")
        self.git("add", "--", PKG + "/run.sh")
        self.assert_unchanged_failure()

    def test_traversal_blocks(self):
        self.manifest["files"]["../outside"] = self.manifest["files"].pop("run.sh")
        self.write_manifest()
        self.git("add", "--", PKG + "/TREE-MANIFEST.json")
        self.assert_unchanged_failure()

    def test_extra_exclusion_cannot_hide_code(self):
        self.manifest["exclusions"].append("extra.py")
        self.write_manifest()
        self.git("add", "--", PKG + "/TREE-MANIFEST.json")
        self.assert_unchanged_failure()

    def test_main_branch_refuses_apply(self):
        self.git("branch", "-m", "main")
        self.assert_unchanged_failure()

    def test_nonobject_manifest_fails_without_traceback(self):
        self.write(PKG + "/TREE-MANIFEST.json", "[]\n")
        self.git("add", "--", PKG + "/TREE-MANIFEST.json")
        before = self.staged_tree()
        result = self.prepare("--apply")
        self.assertEqual(result.returncode, 1)
        self.assertNotIn(b"Traceback", result.stderr)
        self.assertEqual(before, self.staged_tree())

    def test_ref_rejects_tree_object(self):
        self.assertEqual(self.prepare("--apply").returncode, 0)
        tree = self.staged_tree().decode().strip()
        result = self.prepare("--ref", tree)
        self.assertEqual(result.returncode, 1)

    def test_inbox_reads_git_not_dirty_worktree(self):
        self.write("docs/agent-handoffs/index.json", "not JSON")
        result = self.inbox("--ref", self.base)
        self.assertEqual(result.returncode, 0)
        out = json.loads(result.stdout)
        self.assertEqual(out["tasks"], [self.task])
        self.assertEqual(out["authorization"], "none")
        self.assertFalse(out["receipt_or_acknowledgment"])

    def test_unchanged_inbox_emits_no_repeat(self):
        result = self.inbox("--ref", self.base, "--since", self.base)
        self.assertEqual(result.returncode, 0)
        self.assertEqual(json.loads(result.stdout)["tasks"], [])

    def test_changed_status_and_reassignment(self):
        self.task["status"] = "needs_revision"
        self.write_queue()
        self.git("add", "--", "docs/agent-handoffs/index.json")
        self.git("commit", "-qm", "status")
        status_sha = self.git("rev-parse", "HEAD").stdout.decode().strip()
        result = self.inbox("--ref", status_sha, "--since", self.base)
        self.assertEqual(json.loads(result.stdout)["tasks"], [self.task])
        self.task["target_agent"] = "arch"
        self.write_queue()
        self.git("add", "--", "docs/agent-handoffs/index.json")
        self.git("commit", "-qm", "reassign")
        sha = self.git("rev-parse", "HEAD").stdout.decode().strip()
        result = self.inbox("--ref", sha, "--since", status_sha)
        self.assertEqual(json.loads(result.stdout)["removed_or_reassigned_task_ids"], ["existing-task"])

    def test_candidate_command_fields_rejected(self):
        self.task["command"] = "do not execute"
        self.write_queue()
        self.git("add", "--", "docs/agent-handoffs/index.json")
        self.git("commit", "-qm", "invalid")
        sha = self.git("rev-parse", "HEAD").stdout.decode().strip()
        self.assertNotEqual(self.inbox("--ref", sha).returncode, 0)

    def test_fetch_rejects_wrong_origin_without_contact(self):
        self.git("remote", "add", "origin", "https://example.invalid/wrong.git")
        before = self.staged_tree()
        self.assertNotEqual(self.inbox("--fetch").returncode, 0)
        self.assertEqual(before, self.staged_tree())

    def test_explicit_fetch_uses_local_transport_without_checkout(self):
        self.git("update-ref", "refs/heads/codex/staging-coordination", self.base)
        bare = self.repo / "remote.git"
        self.git("clone", "--bare", "--no-hardlinks", str(self.repo), str(bare))
        origin = "https://github.com/quintwilliams84-bot/QA11lylabs.git"
        self.git("remote", "add", "origin", origin)
        # Git transport rewrite stays local; this test never contacts GitHub.
        self.git("config", "url." + bare.as_uri() + ".insteadOf", origin)
        self.write("docs/agent-handoffs/index.json", "preserve dirty work\n")
        before = self.staged_tree()
        head = self.git("rev-parse", "HEAD").stdout
        result = self.inbox("--fetch", "--since", self.base)
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(json.loads(result.stdout)["snapshot"], self.base)
        self.assertEqual(json.loads(result.stdout)["tasks"], [])
        self.assertEqual(head, self.git("rev-parse", "HEAD").stdout)
        self.assertEqual(before, self.staged_tree())
        self.assertEqual((self.repo / "docs/agent-handoffs/index.json").read_text(), "preserve dirty work\n")


if __name__ == "__main__":
    unittest.main()
