/**
 * Seed every quiz under scripts/examples/ (optionally wiping first).
 *
 *   npm run seed:all                 # seeds all examples/*.json with --replace
 *   npm run seed:all -- --wipe       # wipe quiz data first, then seed
 *   npm run seed:all -- --as admin@athma.com
 *
 * Runs the exact same code path as seed-quiz.ts for each file, so any
 * validation error stops that file but the others continue.
 */
import { readdirSync } from 'fs';
import { join, resolve } from 'path';
import { spawnSync } from 'child_process';

const examplesDir = resolve(process.cwd(), 'scripts/examples');
const args = process.argv.slice(2);
const wipe = args.includes('--wipe');
const asEmailIdx = args.indexOf('--as');
const asEmail = asEmailIdx >= 0 ? args[asEmailIdx + 1] : undefined;

function run(cmd: string, cmdArgs: string[]): number {
  console.log(`\n$ ${cmd} ${cmdArgs.join(' ')}`);
  const result = spawnSync(cmd, cmdArgs, { stdio: 'inherit', shell: true });
  return result.status ?? 1;
}

async function main() {
  if (wipe) {
    const code = run('npx', ['tsx', 'scripts/wipe-quizzes.ts', '--yes']);
    if (code !== 0) {
      console.error('wipe failed, aborting');
      process.exit(code);
    }
  }

  const files = readdirSync(examplesDir)
    .filter((f) => f.endsWith('.json'))
    .sort();

  if (files.length === 0) {
    console.log('No JSON files found in scripts/examples/');
    return;
  }

  console.log(`\nSeeding ${files.length} quiz file(s):`);
  files.forEach((f) => console.log('  -', f));

  const results: { file: string; ok: boolean }[] = [];
  for (const file of files) {
    const path = join('scripts/examples', file);
    const seedArgs = ['tsx', 'scripts/seed-quiz.ts', path, '--replace'];
    if (asEmail) seedArgs.push('--as', asEmail);
    const code = run('npx', seedArgs);
    results.push({ file, ok: code === 0 });
  }

  console.log('\n\nSummary:');
  for (const r of results) {
    console.log(`  ${r.ok ? 'OK ' : 'FAIL'}  ${r.file}`);
  }
  const failed = results.filter((r) => !r.ok).length;
  if (failed) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
