import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const cargo = fs.readFileSync(path.join(root, 'src-tauri', 'Cargo.toml'), 'utf8');
const tauri = JSON.parse(fs.readFileSync(path.join(root, 'src-tauri', 'tauri.conf.json'), 'utf8'));

const cargoVersion = cargo.match(/^version\s*=\s*"([^"]+)"/m)?.[1];
const versions = {
  'package.json': pkg.version,
  'src-tauri/Cargo.toml': cargoVersion,
  'src-tauri/tauri.conf.json': tauri.version,
};

const unique = new Set(Object.values(versions));
if (!cargoVersion || unique.size !== 1) {
  console.error('Dayflow version mismatch:');
  for (const [file, version] of Object.entries(versions)) console.error(`  ${file}: ${version ?? 'missing'}`);
  process.exit(1);
}

console.log(`Dayflow version ${pkg.version} is synchronized across package.json, Cargo.toml, and tauri.conf.json.`);
