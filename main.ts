// Solmar Bay — entrypoint program (make.fun gta6-01, program/v1).
// Copies game/ and screenshots/ next to this file into the output directory
// (MAKEFUN_OUTPUT_DIR, or /output when unset) and writes dossier.json there
// with buildDossier from the vendored make.fun library. Node 22 stdlib only.
// The run is fully deterministic: directory order is sorted, file contents
// are copied byte for byte, and dossier.json is whatever buildDossier writes
// from the copied tree, so two runs produce identical bytes.
import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const REPO_ROOT = dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = resolve(process.env.MAKEFUN_OUTPUT_DIR || '/output');

const DOSSIER_CAPS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
};

function main() {
  const gameDir = join(REPO_ROOT, 'game');
  const shotsDir = join(REPO_ROOT, 'screenshots');
  if (!existsSync(gameDir)) throw new Error('game/ directory is missing next to main.ts');
  if (!existsSync(join(gameDir, 'index.html'))) throw new Error('game/index.html is missing');
  if (!existsSync(join(REPO_ROOT, 'vendor', 'makefun-game.ts'))) throw new Error('vendor/makefun-game.ts is missing');
  if (!existsSync(shotsDir)) throw new Error('screenshots/ directory is missing next to main.ts');

  // Start from a clean output directory so stale files can never leak in.
  rmSync(OUTPUT_DIR, { recursive: true, force: true });
  mkdirSync(OUTPUT_DIR, { recursive: true });

  cpSync(gameDir, join(OUTPUT_DIR, 'game'), { recursive: true });
  cpSync(shotsDir, join(OUTPUT_DIR, 'screenshots'), { recursive: true });

  const dossier = buildDossier(OUTPUT_DIR, DOSSIER_CAPS);
  writeFileSync(join(OUTPUT_DIR, 'dossier.json'), dossier);
  console.log('Solmar Bay: wrote ' + OUTPUT_DIR + ' (' + dossier.length + ' byte dossier)');
}

main();
