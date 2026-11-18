// Solmar Bay — submission program (Node 22, standard library only).
// Copies game/ and screenshots/ into the output directory and writes the
// dossier.json that buildDossier produces from them, byte for byte.
import { buildDossier } from './vendor/makefun-game.ts';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR || '/output';

function listFiles(dir, base = '') {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  entries.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
  const files = [];
  for (const entry of entries) {
    const rel = base ? `${base}/${entry.name}` : entry.name;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...listFiles(full, rel));
    else if (entry.isFile()) files.push(rel);
  }
  return files;
}

function copyTree(srcDir, destDir) {
  for (const rel of listFiles(srcDir)) {
    const src = path.join(srcDir, rel);
    const dest = path.join(destDir, rel);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(src, dest);
  }
}

function main() {
  fs.rmSync(outDir, { recursive: true, force: true });
  fs.mkdirSync(outDir, { recursive: true });
  copyTree(path.join(root, 'game'), path.join(outDir, 'game'));
  copyTree(path.join(root, 'screenshots'), path.join(outDir, 'screenshots'));
  const dossier = buildDossier(outDir, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 48 * 1024 * 1024,
    game_path_max_bytes: 1000,
  });
  fs.writeFileSync(path.join(outDir, 'dossier.json'), dossier);
  // Sanity: the dossier must stay under the 1.5 MiB gate cap.
  if (dossier.length > 1536 * 1024) throw new Error(`dossier too large: ${dossier.length} bytes`);
  const gameFiles = listFiles(path.join(outDir, 'game')).length;
  const shotFiles = listFiles(path.join(outDir, 'screenshots')).length;
  console.log(`Solmar Bay: ${gameFiles} game files, ${shotFiles} screenshots, dossier ${dossier.length} bytes -> ${outDir}`);
}

main();
