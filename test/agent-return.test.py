"""Local sidecar validation tests; no networking, Git writes or agent execution."""
import copy
import importlib.util
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / "scripts/validate-agent-return.py"
EXAMPLE = ROOT / "docs/agent-handoffs/templates/agent-return.example.json"
spec = importlib.util.spec_from_file_location("agent_return", SCRIPT)
validator = importlib.util.module_from_spec(spec)
spec.loader.exec_module(validator)


class ReturnContract(unittest.TestCase):
    def setUp(self):
        self.doc = json.loads(EXAMPLE.read_text())
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.file = Path(self.tmp.name) / "return.json"

    def invalid(self, document):
        with self.assertRaises((ValueError, TypeError)):
            validator.validate(document)

    def cli(self):
        return subprocess.run([sys.executable, "-B", str(SCRIPT), "--file", str(self.file)],
                              stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=5)

    def test_example_is_valid_without_authority_or_runtime_claim(self):
        self.assertEqual(validator.validate(self.doc), self.doc)
        self.assertEqual(self.doc["authorization"], "none")
        self.assertTrue(all(c["result"] == "NOT RUN" for c in self.doc["checks"]))

    def test_added_command_and_nested_extra_fields_rejected(self):
        for section in (self.doc, self.doc["source"], self.doc["checks"][0]):
            with self.subTest(section=tuple(section)):
                section["command"] = "never execute"
                self.invalid(self.doc)
                del section["command"]

    def test_invalid_types_enums_version_and_authority(self):
        for key, bad in (("schema_version", True), ("schema_version", 1.0), ("producer", "unknown"),
                         ("producer", []), ("authorization", "approved"), ("next_owner", "unknown"),
                         ("task_id", "Task One"), ("scope_summary", "unsafe\ntext"),
                         ("changed_paths", {}), ("checks", []), ("blockers", "not an array")):
            document = copy.deepcopy(self.doc)
            document[key] = bad
            with self.subTest(key=key, bad=bad):
                self.invalid(document)

    def test_source_requires_allowed_repo_branch_and_full_sha(self):
        for key, bad in (("repository", "other/private"), ("branch", "main\n"),
                         ("commit", "a5e7816"), ("commit", "A" * 40),
                         ("commit", "a" * 40 + "\n")):
            document = copy.deepcopy(self.doc)
            document["source"][key] = bad
            with self.subTest(key=key):
                self.invalid(document)

    def test_canonical_paths_and_duplicates(self):
        for bad in ("../secret", "a/../b", "./a", "/tmp/a", "a//b", "a/./b", "a\\b", "a\nb", "a/", ".", ".."):
            document = copy.deepcopy(self.doc)
            document["changed_paths"] = [bad]
            with self.subTest(path=bad):
                self.invalid(document)
        self.doc["changed_paths"] = [".github/workflows/check.yml", "scripts/check.sh"]
        validator.validate(self.doc)
        self.doc["changed_paths"].append("scripts/check.sh")
        self.invalid(self.doc)

    def test_only_pinned_allowlisted_evidence_urls_or_repo_paths(self):
        base = "https://github.com/quintwilliams84-bot/QA11lylabs/"
        values = ["NOT AVAILABLE", "docs/review.md", base + "commit/" + "a" * 40,
                  base + "blob/" + "a" * 40 + "/docs/review.md"]
        for good in values:
            self.doc["checks"][0]["evidence_ref"] = good
            validator.validate(self.doc)
        bad_values = ["https://example.invalid/private", base + "blob/main/docs/review.md",
                      base + "blob/" + "a" * 40 + "/../secret", base + "commit/" + "a" * 40 + "?token=secret",
                      "https://user:secret@github.com/quintwilliams84-bot/QA11lylabs/commit/" + "a" * 40]
        for bad in bad_values:
            self.doc["checks"][0]["evidence_ref"] = bad
            with self.subTest(evidence=bad):
                self.invalid(self.doc)

    def test_bounds_and_invalid_check_result(self):
        for change in (lambda d: d.update(scope_summary="a" * 321),
                       lambda d: d.update(blockers=["b"] * 17),
                       lambda d: d.update(checks=d["checks"] * 33),
                       lambda d: d["checks"][0].update(result="PASSED"),
                       lambda d: d["checks"][0].update(summary="x" * 321)):
            document = copy.deepcopy(self.doc)
            change(document)
            self.invalid(document)

    def test_duplicate_json_and_oversize_bytes_rejected(self):
        self.file.write_text('{"schema_version":1,"schema_version":1}')
        with self.assertRaises(ValueError):
            validator.load(self.file)
        self.file.write_bytes(b" " * (validator.MAX_BYTES + 1))
        with self.assertRaises(ValueError):
            validator.load(self.file)

    def test_utf16_json_is_rejected_by_utf8_contract(self):
        self.file.write_bytes(json.dumps(self.doc).encode("utf-16"))
        with self.assertRaises(UnicodeDecodeError):
            validator.load(self.file)
        self.assertNotEqual(self.cli().returncode, 0)

    def test_symlink_directory_and_fifo_rejected_without_blocking(self):
        real = self.file.with_name("real.json")
        real.write_text(json.dumps(self.doc))
        self.file.symlink_to(real)
        self.assertNotEqual(self.cli().returncode, 0)
        self.file.unlink()
        self.file.mkdir()
        self.assertNotEqual(self.cli().returncode, 0)
        self.file.rmdir()
        os.mkfifo(self.file)
        self.assertNotEqual(self.cli().returncode, 0)

    def test_cli_reports_generic_error_without_echoing_candidate(self):
        self.file.write_text('PRIVATE_SENTINEL_DO_NOT_ECHO')
        before = self.file.read_bytes()
        result = self.cli()
        self.assertNotEqual(result.returncode, 0)
        self.assertNotIn(b"PRIVATE_SENTINEL", result.stdout + result.stderr)
        self.assertEqual(before, self.file.read_bytes())
        self.file.write_text(json.dumps(self.doc))
        result = self.cli()
        self.assertEqual(result.returncode, 0)
        self.assertIn(b"authorization none", result.stdout)

    def test_schema_contract_has_exact_fields_and_no_routing_change(self):
        schema = json.loads((ROOT / "docs/agent-handoffs/schemas/agent-return.schema.json").read_text())
        self.assertEqual(schema["$schema"], "https://json-schema.org/draft/2020-12/schema")
        self.assertFalse(schema["additionalProperties"])
        self.assertEqual(set(schema["required"]), set(self.doc))
        self.assertEqual(set(schema["properties"]), set(self.doc))
        self.assertEqual(set(schema["properties"]["producer"]["enum"]), validator.PRODUCERS)
        self.assertEqual(set(schema["properties"]["checks"]["items"]["properties"]["result"]["enum"]), validator.RESULTS)


if __name__ == "__main__":
    unittest.main()
