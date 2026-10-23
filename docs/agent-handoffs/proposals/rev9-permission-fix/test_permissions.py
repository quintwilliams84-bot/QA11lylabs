"""Synthetic prefix-only checks. Never executes the harness lifecycle."""
import os, pathlib, shutil, stat, subprocess, tempfile, unittest
PREFIX=pathlib.Path(__file__).with_name('check-prefix.sh')
class Packaging(unittest.TestCase):
 def setUp(self):
  self.tmp=tempfile.TemporaryDirectory(prefix='permission-check-'); self.base=pathlib.Path(self.tmp.name);self.root=self.base/'harness';self.root.mkdir();(self.root/'bin').mkdir()
  for name in ('bin/docker','run-confined.sh','aggregate.sh','supervise.sh'):
   p=self.root/name;p.write_text('#!/bin/sh\nexit 99\n');p.chmod(0o755)
 def tearDown(self):self.tmp.cleanup()
 def run_prefix(self, root=None):
  env={'PATH':os.environ['PATH'],'STAGE_ROOT':str(self.base/'job'),'STAGE_TMP':str(self.base/'scratch'),'STAGE_HARNESS_DIR':str(root or self.root),'STAGE_ASSEMBLY_DIR':str(self.base/'assembly')}
  result=subprocess.run(['bash',str(PREFIX)],env=env,capture_output=True,timeout=4)
  self.assertFalse((self.base/'job').exists());self.assertFalse((self.base/'scratch').exists());return result
 def snapshot(self):return [(str(p.relative_to(self.root)),stat.S_IMODE(p.lstat().st_mode),p.read_bytes() if p.is_file() else None) for p in sorted(self.root.rglob('*'))]
 def test_repeat_valid_no_mutation(self):
  before=self.snapshot()
  self.assertEqual(self.run_prefix().returncode,0);self.assertEqual(self.run_prefix().returncode,0);self.assertEqual(before,self.snapshot())
 def test_missing_file(self):
  (self.root/'bin/docker').unlink();self.assertEqual(self.run_prefix().returncode,3)
 def test_non_executable_stays_non_executable(self):
  p=self.root/'bin/docker';p.chmod(0o644);self.assertEqual(self.run_prefix().returncode,3);self.assertEqual(stat.S_IMODE(p.stat().st_mode),0o644)
 def test_final_symlink(self):
  p=self.root/'bin/docker';p.unlink();p.symlink_to(self.root/'aggregate.sh');self.assertEqual(self.run_prefix().returncode,3)
 def test_parent_symlink(self):
  alias=self.base/'alias';alias.symlink_to(self.root,target_is_directory=True);self.assertEqual(self.run_prefix(alias).returncode,3)
 def test_directory_instead_of_script(self):
  p=self.root/'aggregate.sh';p.unlink();p.mkdir();self.assertEqual(self.run_prefix().returncode,3)
 def test_symlink_with_parent_traversal(self):
  outside=self.base/'outside';outside.mkdir();alias=self.base/'alias';alias.symlink_to(outside,target_is_directory=True)
  self.assertEqual(self.run_prefix(str(alias)+'/../harness').returncode,3)
 def test_relative_directory_rejected(self):
  self.assertEqual(self.run_prefix('relative/harness').returncode,3)
 def test_special_bits_rejected(self):
  p=self.root/'bin/docker';p.chmod(0o4755);self.assertEqual(self.run_prefix().returncode,3)
if __name__=='__main__':unittest.main(verbosity=2)
