import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  INSPECTOR_MIN_COMFORTABLE,
  canShowInspectorColumn,
  estimatedInspectorWidth,
} from './splitInspector.js';

describe('canShowInspectorColumn', () => {
  it('matches the iPad split thresholds', () => {
    assert.equal(canShowInspectorColumn(834), false);
    assert.equal(canShowInspectorColumn(979), false);
    assert.equal(canShowInspectorColumn(1024), true);
    assert.equal(canShowInspectorColumn(1194), true);
  });
});

describe('estimatedInspectorWidth', () => {
  it('never returns a cramped column when the inspector is allowed', () => {
    assert.equal(estimatedInspectorWidth(0), 0);
    const landscape = estimatedInspectorWidth(1194);
    assert.ok(landscape >= INSPECTOR_MIN_COMFORTABLE);
    assert.equal(estimatedInspectorWidth(1024), INSPECTOR_MIN_COMFORTABLE);
    assert.ok(estimatedInspectorWidth(834) < INSPECTOR_MIN_COMFORTABLE);
  });
});
