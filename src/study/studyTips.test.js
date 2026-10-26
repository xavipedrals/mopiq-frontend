import assert from 'node:assert/strict';
import { it } from 'node:test';
import { readStudyTips, writeStudyTips } from './studyTips.js';
it('keeps tutorial progress private to each account and tolerates blocked storage',()=>{
  const data=new Map();const storage={getItem:key=>data.get(key),setItem:(key,value)=>data.set(key,value)};
  assert.equal(readStudyTips(storage,'a'),'recall');
  writeStudyTips(storage,'a','complete');
  assert.equal(readStudyTips(storage,'a'),'complete');assert.equal(readStudyTips(storage,'b'),'recall');
  writeStudyTips(storage,'a','invalid');assert.equal(readStudyTips(storage,'a'),'complete');
  assert.equal(readStudyTips(storage,null),'complete');
  assert.equal(readStudyTips({getItem(){throw new Error('blocked')}},'a'),'recall');
  assert.doesNotThrow(()=>writeStudyTips({setItem(){throw new Error('blocked')}},'a','complete'));
});

it('remembers completing the demo separately from the live tips',async()=>{
  const { tutorialCompleted, completeTutorial } = await import('./studyTips.js');
  const data=new Map();const storage={getItem:key=>data.get(key),setItem:(key,value)=>data.set(key,value)};
  assert.equal(tutorialCompleted(storage,'a'),false);completeTutorial(storage,'a');
  assert.equal(tutorialCompleted(storage,'a'),true);assert.equal(tutorialCompleted(storage,'b'),false);
  assert.equal(readStudyTips(storage,'a'),'recall');
});
