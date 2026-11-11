import assert from 'node:assert/strict';
import { test } from 'node:test';
import { preparedPowerPointSubmission } from './powerpointSubmission.js';
import { sharedGenerationRequest } from './sharedGeneration.js';

const payload = {
  source: 'powerpoint', file: { name: 'lecture.pptx' }, name: 'Lecture', topic: 'languages',
  deckId: 'existing-deck', targetSubdeckId: 42, generationInstructions: 'Focus on definitions.',
};

test('legacy PPTX imports submit text through the existing paste contract without uploading a file', () => {
  const text = 'Slide text and speaker notes. '.repeat(20);
  const result = preparedPowerPointSubmission(payload, text);
  assert.equal(result.source, 'paste');
  assert.equal(result.text, text.trim());
  assert.equal(result.file, null);
  assert.equal(result.name, payload.name);
  assert.equal(result.topic, payload.topic);
  assert.equal(result.deckId, payload.deckId);
  assert.equal(result.targetSubdeckId, 42);
});

test('shared PPTX imports keep source identity, notes mode and instructions without a storage upload', () => {
  const result = preparedPowerPointSubmission(payload, 'Speaker notes', true);
  const request = sharedGenerationRequest({ ...result, requestId: 'request' });
  assert.equal(request.sourceKind, 'powerpoint');
  assert.equal(request.text, 'Speaker notes');
  assert.equal(request.storagePath, null);
  assert.equal(request.mode, 'notes');
  assert.equal(request.targetSubdeckId, 42);
  assert.equal(request.generationInstructions, payload.generationInstructions);
});

test('empty and oversized presentations fail before a job is submitted instead of silently truncating text', () => {
  assert.throws(() => preparedPowerPointSubmission(payload, ''), { code: 'pptx_empty' });
  assert.throws(() => preparedPowerPointSubmission(payload, 'Too short'), { code: 'pptx_too_short' });
  assert.throws(() => preparedPowerPointSubmission(payload, 'x'.repeat(400_001)), { code: 'pptx_too_long' });
  assert.throws(() => preparedPowerPointSubmission(payload, 'x'.repeat(4_000_001), true), { code: 'pptx_too_long' });
});
