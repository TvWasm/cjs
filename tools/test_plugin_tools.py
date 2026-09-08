"""Offline publishing regression checks; never write to real site releases."""
import json
import shutil
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


class PublishingTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.site = self.root / 'sites/tv.cctv.com'
        self.site.mkdir(parents=True)
        original = ROOT / 'sites/tv.cctv.com'
        for name in ('site.json', 'main.js', 'plugin.json'):
            shutil.copy2(original / name, self.site / name)
        shutil.copytree(original / 'dist', self.site / 'dist')
        self.base = 'https://plugins.example.test/releases/stable'

    def tool(self, name, *args, success=True):
        result = subprocess.run([sys.executable, str(ROOT / 'tools' / name),
                                 '--root', str(self.root), '--base-url', self.base, *args],
                                capture_output=True, text=True)
        self.assertEqual(result.returncode == 0, success, result.stdout + result.stderr)
        return result

    def test_custom_hosting_preserves_runtime_bytes(self):
        before = (self.site / 'dist/runtime.json').read_bytes()
        self.tool('build_plugin.py')
        self.tool('verify_plugin.py')
        self.assertEqual(before, (self.site / 'dist/runtime.json').read_bytes())
        catalog = json.loads((self.root / 'catalog.json').read_text())
        self.assertEqual(catalog['sites'][0]['sources'], [self.base + '/cctv.cjs'])

    def test_changed_script_requires_version_bump_without_partial_publication(self):
        runtime = (self.site / 'dist/runtime.json').read_bytes()
        with (self.site / 'main.js').open('a', encoding='utf-8') as output:
            output.write('\n// changed release\n')
        result = self.tool('build_plugin.py', success=False)
        self.assertIn('increase version', result.stderr)
        self.assertEqual(runtime, (self.site / 'dist/runtime.json').read_bytes())
        self.assertFalse((self.root / 'catalog.json').exists())
        config_path = self.site / 'site.json'
        config = json.loads(config_path.read_text())
        config['version'] += 1
        config['jsApi'] = 'ku9'
        config_path.write_text(json.dumps(config), encoding='utf-8')
        self.tool('build_plugin.py')
        self.tool('verify_plugin.py')

    def test_corrupt_artifact_is_rejected(self):
        self.tool('build_plugin.py')
        (self.site / 'dist/armeabi-v7a/cctv.so').write_bytes(b'truncated')
        self.tool('verify_plugin.py', success=False)

    def test_manifest_cannot_escape_root(self):
        self.tool('build_plugin.py')
        path = self.site / 'plugin.json'
        manifest = json.loads(path.read_text())
        manifest['files'][0]['url'] = self.base + '/%2e%2e/outside.json'
        path.write_text(json.dumps(manifest), encoding='utf-8')
        result = self.tool('verify_plugin.py', success=False)
        self.assertIn('outside --root', result.stderr)


if __name__ == '__main__':
    unittest.main()
