import copy
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location("handoffs", ROOT / "scripts/read-agent-handoffs.py")
reader = importlib.util.module_from_spec(spec)
spec.loader.exec_module(reader)


class HandoffTests(unittest.TestCase):
    def setUp(self):
        self.document = reader.load(ROOT / "docs/agent-handoffs/index.json")

    def test_real_inbox_selects_only_requested_agent(self):
        report = reader.select(self.document, "muse")
        self.assertEqual(len(report["tasks"]), 1)
        self.assertEqual(report["tasks"][0]["id"], "scanner-ip-follow-up")
        self.assertEqual(report["authorization"], "none")
        self.assertFalse(report["receipt_or_acknowledgment"])

    def test_empty_inbox_is_not_an_error(self):
        self.assertEqual(reader.select(self.document, "arch")["tasks"], [])

    def rejects(self, change):
        candidate = copy.deepcopy(self.document)
        change(candidate)
        with self.assertRaises((ValueError, TypeError)):
            reader.validate(candidate)

    def test_command_injection_field_rejected(self):
        self.rejects(lambda d: d["tasks"][0].update(command="touch unwanted"))

    def test_authorization_field_rejected(self):
        self.rejects(lambda d: d.update(deploy_authorized=True))

    def test_unknown_status_cannot_claim_approval(self):
        self.rejects(lambda d: d["tasks"][0].update(status="approved"))

    def test_mutable_reference_not_accepted_as_commit(self):
        self.rejects(lambda d: d["tasks"][0]["source"].update(commit="main"))

    def test_unknown_repository_rejected(self):
        self.rejects(lambda d: d["tasks"][0]["source"].update(repository="other/repo"))

    def test_duplicate_task_rejected(self):
        self.rejects(lambda d: d["tasks"].append(d["tasks"][0]))

    def test_task_count_bounded(self):
        self.rejects(lambda d: d.update(tasks=d["tasks"] * 20))

    def test_read_preserves_contents_and_mtime(self):
        path = ROOT / "docs/agent-handoffs/index.json"
        before = (path.read_bytes(), path.stat().st_mtime_ns)
        reader.load(path)
        self.assertEqual(before, (path.read_bytes(), path.stat().st_mtime_ns))

    def test_oversized_file_and_symlink_rejected(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "oversized.json"
            path.write_bytes(b" " * (reader.MAX_BYTES + 1))
            with self.assertRaises(ValueError):
                reader.load(path)
            link = Path(directory) / "link.json"
            link.symlink_to(path)
            with self.assertRaises(OSError):
                reader.load(link)

    def test_duplicate_json_keys_rejected(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "duplicate.json"
            path.write_text('{"schema_version":1,"schema_version":1}')
            with self.assertRaises(ValueError):
                reader.load(path)


if __name__ == "__main__":
    unittest.main()
