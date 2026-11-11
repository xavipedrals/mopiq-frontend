import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { applyPersonalTopicSnapshot, createPersonalTopicClient, legacyTopicKey } from './personalDeckTopics.js';
import { getDeckTopicByPostgresId } from '../utils.js';

const deck = { id: 'server-uuid', firebaseId: 'local-ulid', topic: getDeckTopicByPostgresId('medicine') };
const snapshot = (key = 'psychology', version = 1) => ({ topicSchemaVersion: 1, topics: [{ deckId: 'local-ulid', topicKey: key, version }] });

describe('personal topics compatibility', () => {
  it('hydrates by the iOS local ID, preserves unknown raw keys, and respects explicit clears', () => {
    assert.equal(applyPersonalTopicSnapshot(deck, snapshot()).topic.imageName, 'psychology');
    const unknown = applyPersonalTopicSnapshot(deck, snapshot('future-topic'));
    assert.equal(unknown.topic.imageName, 'other');
    assert.equal(unknown.personalTopicKey, 'future-topic');
    assert.equal(applyPersonalTopicSnapshot(unknown, snapshot(null, 2)).topic.imageName, 'medicine');
    assert.equal(applyPersonalTopicSnapshot(deck, { topics: [{ deckId: deck.id, topicKey: 'finance' }] }).topic.imageName, 'medicine');
    assert.equal(legacyTopicKey('finance'), 'other');
    assert.equal(legacyTopicKey('biology'), 'biology');
  });

  it('uses existing capability-gated RPC shapes, sends explicit clears, and validates receipts', async () => {
    const calls = [];
    const client = createPersonalTopicClient({ getUserId: () => 'owner', randomUUID: () => 'mutation-id', now: () => 1000,
      rpc: async (name, params) => {
        calls.push([name, params]);
        return { data: name === 'get_library_organization' ? snapshot() : { snapshot: snapshot(params.p_mutations[0].topicKey, 2), results: [{ id: 'mutation-id', status: 'applied' }] } };
      },
    });
    assert.equal((await client.save(deck, 'business')).topic.imageName, 'business');
    assert.deepEqual(calls[0], ['get_library_organization', { p_expected_user_id: 'owner' }]);
    assert.deepEqual(calls[1], ['apply_library_organization_mutations', { p_expected_user_id: 'owner', p_mutations: [{ id: 'mutation-id', kind: 'setDeckTopic', deckId: 'local-ulid', topicKey: 'business', createdAt: 1, assignments: [] }] }]);
    assert.equal((await client.save(deck, 'medicine')).topic.imageName, 'medicine');
    assert.equal(calls[2][1].p_mutations[0].topicKey, null);
  });

  it('does not send mutations to an older backend or acknowledge an incomplete reply', async () => {
    const calls = [];
    const old = createPersonalTopicClient({ getUserId: () => 'owner', rpc: async name => { calls.push(name); return { data: { topics: [] } }; } });
    await assert.rejects(old.save(deck, 'finance'), /unavailable/);
    assert.deepEqual(calls, ['get_library_organization']);
    const missingReceipt = createPersonalTopicClient({ getUserId: () => 'owner', rpc: async name => ({ data: name === 'get_library_organization' ? snapshot() : { snapshot: snapshot() } }) });
    await assert.rejects(missingReceipt.save(deck, 'finance'), /Could not save/);
  });

  it('discards in-flight results after an account switch', async () => {
    let user = 'first', resolve;
    const client = createPersonalTopicClient({ getUserId: () => user, rpc: () => new Promise(done => { resolve = done; }) });
    const pending = client.load();
    user = 'second';
    resolve({ data: snapshot() });
    await assert.rejects(pending, /Account changed/);
  });

  it('retains a known choice when refresh fails but clears it after logout', async () => {
    let user = 'owner', failed = false;
    const client = createPersonalTopicClient({ getUserId: () => user, rpc: async () => { if (failed) throw new Error('offline'); return { data: snapshot() }; } });
    await client.load();
    failed = true;
    assert.equal((await client.hydrate([deck]))[0].topic.imageName, 'psychology');
    user = null;
    assert.equal((await client.hydrate([deck]))[0].topic.imageName, 'medicine');
  });

  it('retries an unacknowledged mutation with the same ID after a reload', async () => {
    const values = new Map(), attempts = [];
    const storage = { keys: () => [...values.keys()], getItem: key => values.get(key), setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) };
    let disconnected = true;
    const rpc = async (name, params) => {
      if (name === 'get_library_organization') return { data: snapshot() };
      const mutation = params.p_mutations[0];
      attempts.push(mutation.id);
      if (disconnected) throw new Error('Connection lost after sending');
      return { data: { snapshot: snapshot(mutation.topicKey, 2), results: [{ id: mutation.id, status: 'applied' }] } };
    };
    const first = createPersonalTopicClient({ getUserId: () => 'owner', randomUUID: () => 'original-id', rpc, storage });
    await assert.rejects(first.save(deck, 'finance'), /Connection lost/);
    assert.equal(values.size, 1);
    disconnected = false;
    const reloaded = createPersonalTopicClient({ getUserId: () => 'owner', rpc, storage });
    assert.equal((await reloaded.hydrate([deck]))[0].topic.imageName, 'finance');
    assert.deepEqual(attempts, ['original-id', 'original-id']);
    await reloaded.retry();
    assert.equal(values.size, 0);
  });

  it('keeps pending choices isolated by account while offline', async () => {
    let user = 'first';
    const values = new Map();
    const storage = { keys: () => [...values.keys()], getItem: key => values.get(key), setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) };
    const client = createPersonalTopicClient({ getUserId: () => user, rpc: async name => {
      if (name === 'get_library_organization') return { data: { topicSchemaVersion: 1, topics: [] } };
      throw new Error('offline');
    }, storage });
    await assert.rejects(client.save(deck, 'business'), /offline/);
    assert.equal((await client.hydrate([deck]))[0].topic.imageName, 'business');
    user = 'second';
    assert.equal((await client.hydrate([deck]))[0].topic.imageName, 'medicine');
    user = 'first';
    assert.equal((await client.hydrate([deck]))[0].topic.imageName, 'business');
  });

  it('preserves changes queued by separate tabs and batches their recovery', async () => {
    const values = new Map(), batches = [];
    const storage = { keys: () => [...values.keys()], getItem: key => values.get(key), setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) };
    let offline = true;
    const rpc = async (name, params) => {
      if (name === 'get_library_organization') return { data: { topicSchemaVersion: 1, topics: [] } };
      if (offline) throw new Error('offline');
      batches.push(params.p_mutations);
      return { data: { snapshot: { topicSchemaVersion: 1, topics: params.p_mutations.map(mutation => ({ ...mutation, version: 1 })) }, results: params.p_mutations.map(mutation => ({ id: mutation.id, status: 'applied' })) } };
    };
    const first = createPersonalTopicClient({ getUserId: () => 'owner', randomUUID: () => 'first-tab-id', rpc, storage });
    const second = createPersonalTopicClient({ getUserId: () => 'owner', randomUUID: () => 'second-tab-id', rpc, storage });
    await assert.rejects(first.save(deck, 'business'), /offline/);
    await assert.rejects(second.save({ firebaseId: 'another-local-id' }, 'finance'), /offline/);
    assert.equal(values.size, 2);
    offline = false;
    await first.retry();
    assert.deepEqual(batches[0].map(mutation => mutation.id), ['first-tab-id', 'second-tab-id']);
    assert.equal(values.size, 0);
  });
});
