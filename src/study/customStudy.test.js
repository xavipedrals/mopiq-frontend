import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { customStudyDefaults, normalizeCustomStudy, customStudyParams, createCustomStudyQueue, saveCustomStudySnapshot, readCustomStudySnapshot } from './customStudy.js';
import { applyFilteredAnswer, filteredPreviewIntervals } from './filteredScheduling.js';
import { applyAnswer } from './scheduler.js';
import { parseDeckConfig } from './deckConfig.js';

const storage = () => { const data = new Map(); return { getItem:k=>data.get(k),setItem:(k,v)=>data.set(k,v) }; };
const config = parseDeckConfig({});
describe('custom study selection and finite queue', () => {
  it('matches the four iOS starting points and sends count requests without snapshots', () => {
    assert.deepEqual(customStudyDefaults('needsPractice').lastAnswers, ['AGAIN','HARD']);
    assert.equal(customStudyDefaults('flagged').anyFlag, true);
    assert.equal(customStudyDefaults('entireDeck').limit, null);
    assert.equal(customStudyDefaults('chooseCards').shuffle, true);
    assert.equal(customStudyParams('deck',customStudyDefaults()).p_include_ids,false);
    assert.equal(customStudyParams('deck',customStudyDefaults(),true).p_shuffle,true);
    assert.equal(normalizeCustomStudy({limit:'bad'}).limit,0);
    assert.equal(normalizeCustomStudy({limit:-2}).limit,0);
    assert.deepEqual(normalizeCustomStudy({flagIDs:['a','a'],subdeckIDs:[1,1]}).flagIDs,['a']);
  });
  it('does not reinsert Again cards or admit suspended cards and can revisit a previous answer', () => {
    const first={id:'a'},next={id:'b'},blocked={id:'c',suspended:true};
    const queue=createCustomStudyQueue([first,first,next,blocked]);
    assert.equal(queue.remaining(),2);
    assert.equal(queue.pop().id,'a');
    queue.afterAnswer(first,{...first,state:'LEARNING'});
    assert.equal(queue.pop().id,'b');
    assert.equal(queue.cardStudiedBefore('b'),'a');
    queue.restoreLastPopped();
    assert.equal(queue.uniqueStudiedCount(),0);
    queue.afterAnswer(first,first);
    assert.equal(queue.pop().id,'b');
    queue.afterAnswer(next,next);
    assert.equal(queue.pop(),null);
    assert.equal(queue.uniqueStudiedCount(),2);
  });
  it('scopes stored snapshots to both account and deck', () => {
    const store=storage();const id=saveCustomStudySnapshot(store,'owner','deck',['a','a','b']);
    assert.deepEqual(readCustomStudySnapshot(store,id,'owner','deck'),['a','b']);
    assert.equal(readCustomStudySnapshot(store,id,'other','deck'),null);
    assert.equal(readCustomStudySnapshot(store,id,'owner','other'),null);
    assert.equal(readCustomStudySnapshot(store,'missing','owner','deck'),null);
  });
});
describe('filtered scheduling matches iOS early learning', () => {
  const now=new Date('2026-10-26T10:00:00Z');
  for(const state of ['LEARNING','RELEARNING']) {
    const card={id:'a',state,dueDate:'2026-10-26T11:00:00Z',intervalSecs:3600,reviewCount:3,easeFactor:2500,lapseCount:2};
    it(`preserves ${state} steps on early Hard, Good and Easy`,()=>{
      for(const answer of ['HARD','GOOD','EASY']) {
        const updated=applyFilteredAnswer(card,answer,config,now);
        assert.equal(updated.dueDate,card.dueDate);assert.equal(updated.state,state);assert.equal(updated.reviewCount,4);
        assert.equal(updated.intervalSecs,3600);assert.equal(updated.lapseCount,2);
      }
      assert.equal(filteredPreviewIntervals(card,config,now).GOOD,3600);
    });
    it(`restarts ${state} on Again without another lapse`,()=>{
      const updated=applyFilteredAnswer(card,'AGAIN',config,now);
      assert.equal(updated.lapseCount,2);assert.equal(updated.state,state);assert.equal(updated.easeFactor,2500);
      assert.equal(new Date(updated.dueDate).getTime(),now.getTime()+filteredPreviewIntervals(card,config,now).AGAIN*1000);
    });
  }
  it('keeps the normal scheduler for new and already-due learning cards',()=>{
    const card={id:'new',state:'NEW',reviewCount:0};
    assert.deepEqual(applyFilteredAnswer(card,'GOOD',config,now),applyAnswer(card,'GOOD',config));
  });
});
