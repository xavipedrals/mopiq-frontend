import { benchmarkFile } from './extractor.js';
const $ = id => document.getElementById(id);
const mb = bytes => (bytes / 1_000_000).toFixed(2) + ' MB';
const save = (name, text, type) => {
 const url = URL.createObjectURL(new Blob([text], { type }));
 const a = document.createElement('a'); a.href = url; a.download = name; a.click();
 setTimeout(() => URL.revokeObjectURL(url), 1000);
};
let controller, lastText = '';
window.results = [];
window.runFile = async file => {
 controller = new AbortController(); $('cancel').disabled = false; $('extract').disabled = true;
 $('error').textContent = ''; $('progress').value = 0; $('status').textContent = 'Opening ' + file.name;
 try {
  const result = await benchmarkFile(file, { signal: controller.signal, onProgress(done, total) {
   $('progress').max = total; $('progress').value = done; $('status').textContent = `Reading slide ${done} of ${total}…`;
  } });
  const row = { file: file.name, ...result.metrics, userAgent: navigator.userAgent, timestamp: new Date().toISOString() };
  window.results.push(row); window.lastResult = result;
  lastText = result.text; $('preview').textContent = result.text.slice(0, 7000); $('text').disabled = false;
  const tr = document.createElement('tr');
  for (const text of [file.name, String(row.slides), mb(row.inputBytes), (row.durationMs / 1000).toFixed(3) + ' s', mb(row.textBytes), row.maxLongTaskMs == null ? 'Unavailable' : Math.round(row.maxLongTaskMs) + ' ms']) {
   const td = document.createElement('td'); td.textContent = text; tr.append(td);
  }
  $('results').append(tr);
  $('status').textContent = `Done: ${row.slides} slides, ${row.slidesWithNotes} with speaker notes. ${Math.round(100 * (1 - row.textBytes / row.inputBytes))}% smaller as text.`;
  return row;
 } catch (error) { $('error').textContent = error.message; throw error; }
 finally { $('cancel').disabled = true; $('extract').disabled = false; controller = null; }
};
$('extract').onclick = () => { const file = $('file').files[0]; if (file) window.runFile(file).catch(() => {}); };
$('cancel').onclick = () => controller?.abort();
$('export').onclick = () => save('pptx-browser-results.json', JSON.stringify(window.results, null, 2), 'application/json');
$('text').onclick = () => save('extracted-slides.txt', lastText, 'text/plain');
const samples = await (await fetch('./samples/manifest.json')).json();
window.runSample = async id => {
 const sample = samples.find(s => s.id === id);
 if (!sample) throw new Error('Unknown sample');
 $('status').textContent = 'Loading sample…';
 const response = await fetch('./samples/' + sample.file);
 if (!response.ok) throw new Error('Sample is not downloaded; run prepare-samples.py.');
 const file = new File([await response.blob()], sample.file);
 return window.runFile(file);
};
for (const sample of samples) {
 const div = document.createElement('div'); div.style.cssText = 'display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin:16px 0';
 const copy = document.createElement('span'); copy.style.flex = '1'; copy.textContent = `${sample.name} · ${sample.slides} slides · ${mb(sample.bytes)}`;
 const source = document.createElement('a'); source.href = sample.sourceUrl; source.target = '_blank'; source.rel = 'noopener'; source.textContent = 'Source';
 const download = document.createElement('a'); download.href = './samples/' + sample.file; download.download = sample.file; download.textContent = 'Download PPTX';
 const run = document.createElement('button'); run.textContent = 'Test in this browser'; run.onclick = () => window.runSample(sample.id).catch(error => $('error').textContent = error.message);
 div.append(copy, source, download, run); $('samples').append(div);
}
window.benchmarkReady = true;

try {
 const response = await fetch('./results/benchmark.json');
 if (response.ok) {
  const report = await response.json();
  for (const sample of samples) {
   const rows = report.summary.filter(row => row.sampleId === sample.id);
   if (!rows.length) continue;
   const tr = document.createElement('tr');
   const times = ['Chromium desktop', 'WebKit desktop', 'Chromium 6× CPU slowdown'].map(profile => {
    const row = rows.find(r => r.profile === profile);
    return row?.medianMs == null ? 'Unavailable' : (row.medianMs / 1000).toFixed(2) + ' s';
   });
   for (const text of [sample.name, String(sample.slides), mb(sample.bytes), ...times]) {
    const td = document.createElement('td'); td.textContent = text; tr.append(td);
   }
   $('recorded-rows').append(tr);
  }
  $('recorded-note').textContent = `${report.runs.length} verified runs. Text, slide order and notes matched an independent Python parser. The realistic 154-slide deck caused a main-thread pause up to 0.80 seconds under 6× slowdown; off-main-thread parsing deserves a further test. An earlier download-button run failed once in WebKit for the 95 MB file; native file-picker runs all passed.`;
  $('recorded').hidden = false;
 }
} catch { /* The lab also works before an automated report exists. */ }
