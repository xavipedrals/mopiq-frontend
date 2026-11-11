import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium, webkit } from '@playwright/test';
const root = dirname(fileURLToPath(import.meta.url));
const samples = JSON.parse(await readFile(join(root, 'samples/manifest.json'), 'utf8')).filter(s => !process.env.SAMPLE_IDS || process.env.SAMPLE_IDS.split(',').includes(s.id));
const output = join(root, 'results'); await mkdir(output, { recursive: true });
const baseURL = process.env.BENCHMARK_URL || 'http://127.0.0.1:4187';
const repetitions = Number(process.env.REPETITIONS || 3);
const all = [], browserVersions = {}, failures = [];
const profiles = [
 { name: 'Chromium desktop', type: chromium, rate: 1 },
 { name: 'WebKit desktop', type: webkit, rate: 1 },
 { name: 'Chromium 6× CPU slowdown', type: chromium, rate: 6 },
];
for (const profile of profiles.filter(p => !process.env.PROFILES || process.env.PROFILES.split(',').includes(p.name))) {
 const browser = await profile.type.launch({ headless: true, ...(profile.type === chromium ? { args: ['--enable-precise-memory-info'] } : {}) });
 browserVersions[profile.name] = browser.version();
 try {
  for (const sample of samples) {
   for (let run = 1; run <= repetitions; run++) {
    const context = await browser.newContext({ viewport: { width: 1280, height: 1000 } });
    const page = await context.newPage();
    const outsideRequests = [], errors = [];
    await page.route('**/*', route => {
     if (new URL(route.request().url()).origin === new URL(baseURL).origin) return route.continue();
     outsideRequests.push(route.request().url()); return route.abort();
    });
    page.on('pageerror', error => errors.push(error.message));
    try {
     await page.goto(baseURL);
     await page.waitForFunction(() => window.benchmarkReady, { timeout: 30000 });
     if (profile.rate !== 1) {
      const cdp = await context.newCDPSession(page);
      await cdp.send('Emulation.setCPUThrottlingRate', { rate: profile.rate });
     }
     await page.locator('#file').setInputFiles(join(root, 'samples', sample.file));
     const row = await page.evaluate(() => window.runFile(document.getElementById('file').files[0]));
     for (const key of ['slides', 'nonemptySlides', 'slidesWithNotes', 'characters', 'textBytes', 'textSha256']) assert.equal(row[key], sample[key], sample.id + ': ' + key);
     assert.deepEqual(outsideRequests, [], 'No external upload or API request');
     assert.deepEqual(errors, [], 'No page errors');
     all.push({ profile: profile.name, run, sampleId: sample.id, kind: sample.kind, ...row });
     console.log(`${profile.name} · ${sample.id} · run ${run}: ${Math.round(row.durationMs)} ms; ${row.longTasks ?? 'n/a'} long tasks; verified`);
    } catch (error) {
     failures.push({ profile: profile.name, sampleId: sample.id, run, error: error.message, pageErrors: errors });
     console.log('FAIL', JSON.stringify(failures.at(-1)));
    } finally { await context.close(); }
   }
  }
 } finally { await browser.close(); }
}
const median = values => [...values].sort((a,b) => a-b)[Math.floor(values.length/2)];
const summary = profiles.flatMap(profile => samples.map(sample => {
 const runs = all.filter(row => row.profile === profile.name && row.sampleId === sample.id);
 return { profile: profile.name, sampleId: sample.id, kind: sample.kind, slides: sample.slides, inputMB: sample.bytes / 1e6,
  successfulRuns: runs.length, medianMs: runs.length ? median(runs.map(row => row.durationMs)) : null,
  maxTimerGapMs: runs.length ? Math.max(...runs.map(row => row.maxTimerGapMs)) : null,
  maxLongTaskMs: runs.length && runs[0].maxLongTaskMs != null ? Math.max(...runs.map(row => row.maxLongTaskMs)) : null,
  maxJsHeapGrowthMB: runs.length && runs[0].approximateJsHeapGrowthBytes != null ? Math.max(...runs.map(row => row.approximateJsHeapGrowthBytes)) / 1e6 : null,
  maxArchiveReadMB: runs.length ? Math.max(...runs.map(row => row.archiveReadBytes)) / 1e6 : null,
  textKB: sample.textBytes / 1000 };
}));
const report = { generatedAt: new Date().toISOString(), hardware: 'Apple M4 Pro Mac, 48 GiB RAM; not a physical iPhone', browserVersions, repetitions,
 method: 'New browser context per run. Native file picker inputs are used; setting the file input precedes the extraction timer. No network allowed outside the local lab origin. Exact extracted-text SHA-256, slide count and notes count checked against independent Python XML extraction. Heap readings cover V8 JS only; worker, native and Blob memory are excluded. CPU slowdown affects Chromium main-thread execution and does not emulate iPhone hardware.',
 summary, failures, runs: all };
await writeFile(join(output, 'benchmark.json'), JSON.stringify(report, null, 2) + '\n');
const keys = Object.keys(summary[0]);
await writeFile(join(output, 'benchmark.csv'), [keys.join(','), ...summary.map(row => keys.map(key => JSON.stringify(row[key])).join(','))].join('\n') + '\n');
console.log(JSON.stringify(summary, null, 2));
if (failures.length) process.exitCode = 1;
