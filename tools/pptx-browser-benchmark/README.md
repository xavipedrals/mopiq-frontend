# PPTX browser extraction lab

This is a separate local experiment. It does not change the website's import
routing, dependencies, backend worker, database, or API contracts. Extraction
runs in the browser. It does not call AI or upload a presentation.

## Open the lab

From this folder:

```sh
npm ci --ignore-scripts
python3 prepare-samples.py --download
npm start
```

Open <http://127.0.0.1:4187> in Chrome or Safari. The server accepts GET/HEAD only.
Choose a PPTX in the native file picker and press **Extract locally**. Downloaded
samples are also available from this page. Test your own decks with this same
picker; it lets the ZIP reader access file slices without loading the entire
presentation into a JavaScript ArrayBuffer.

For an optional phone test on the same local network, start with
`HOST=0.0.0.0 npm start`, open the Mac's LAN address on port 4187, download a sample,
and choose it in the picker. This makes the public example files available to
your LAN. It still provides no upload endpoint. Plain HTTP on a LAN may not
provide Web Crypto, so the optional text checksum is omitted in that case;
extraction and timing still run. A desktop WebKit test is not an iPhone test.

## Samples and attribution

- Stanford CS106AX, JavaScript Basics, original 31-slide file:
  <https://web.stanford.edu/class/cs106ax/lectures.html>.
- University of Auckland COMPSCI 107, Python Basics and Introduction, original
  26- and 32-slide files:
  <https://www.cs.auckland.ac.nz/courses/compsci107s1c/lectures/>.
- Kurose and Ross, *Computer Networking: A Top-Down Approach*, ninth-edition
  Transport Layer, original 154-slide file. Copyright 1996–2025 J.F. Kurose and
  K.W. Ross, all rights reserved. The authors make the slides freely available
  with attribution: <https://gaia.cs.umass.edu/kurose_ross/ppt.php>.
- Two **synthetic** 300-slide stress decks repeat slides from the Stanford and
  Auckland lectures. One reuses media and one duplicates media between cycles
  to make a 95 MB file. They are not naturally authored 300-slide lectures.

`prepare-samples.py` records direct source URLs, actual file sizes, expected
slide/notes counts and independent extracted-text checksums in
`samples/manifest.json`. Original and generated PPTX files are ignored by Git.
Copyright remains with the original authors; examples are kept locally for
compatibility testing and are not published by this experiment.

## What is measured

The prototype uses zip.js 2.8.26 with a `BlobReader`, reads only presentation,
slide, relationship and speaker-note XML, and uses `DOMParser` for XML parsing.
It follows package relationships and the declared slide order. It preserves
blank slides, combines text runs, decodes XML entities and skips media. It yields
to the event loop every five slides. Image-only content needs a future OCR or
vision step; no images are decoded in this benchmark.

Measurements include extraction duration, XML read/parse time, bytes requested
from the archive, decompressed XML bytes, output text bytes, notes count, timer
responsiveness, Chromium long tasks and approximate Chromium JS heap readings.
The archive-read metric includes repeated reads and is not a unique-byte count.
File selection, fetching a sample, AI generation and uploads are outside the
timed interval. JavaScript heap readings exclude native/Blob/worker memory and
must not be interpreted as total process memory or an iPhone memory ceiling.

The benchmark allows up to 150 MiB and 1,000 slides to support stress experiments.
These are experiment limits, not changes to production limits. XML extraction
has per-part and aggregate expansion limits. No macros, embedded files or
external relationships are executed or fetched.

## Reproduce the automated run

The parent website checkout supplies `@playwright/test`:

```sh
# In the website root, install the test browsers if absent:
npx playwright install chromium webkit
# Leave npm start running in this lab, then:
node tools/pptx-browser-benchmark/run-benchmark.mjs
```

Three repetitions run in separate browser contexts for desktop Chromium,
desktop WebKit and Chromium with a 6× CPU slowdown. All external requests are
blocked. Tests use the native file picker and compare slide count, note count,
output length and SHA-256 with an independent Python XML extraction. CPU
slowdown is a main-thread stress approximation, not mobile hardware emulation.

`results/benchmark.json` and `results/benchmark.csv` hold the native-picker
results. `results/download-button-initial.json` preserves the initial test of
sample fetching, including one WebKit failure for the 95 MB file. A successful
native-picker run does not erase that observed limitation.

Optional filters: `REPETITIONS`, `PROFILES` (comma-separated profile names),
`SAMPLE_IDS` (comma-separated manifest IDs), and `BENCHMARK_URL`.
