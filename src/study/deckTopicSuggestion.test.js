import test from 'node:test';
import assert from 'node:assert/strict';
import { createTopicSuggestionModel } from './deckTopicSuggestion.js';
const deferred = () => { let resolve, reject; const promise = new Promise((a,b)=>{resolve=a;reject=b;}); return {promise,resolve,reject}; };
const tick = () => new Promise(resolve=>setImmediate(resolve));
function harness(classify) {
 let owner='alice',state,scheduled; const calls=[];
 const model=createTopicSuggestionModel({classify:(name,options)=>{calls.push({name,...options});return classify(name,options);},getIdentity:()=>owner,onChange:value=>{state=value;},schedule:(callback,delay)=>{scheduled={callback,delay};return scheduled;},unschedule:()=>{scheduled=null;}});
 return {model,calls,get state(){return state;},get timer(){return scheduled;},setOwner:value=>{owner=value;}};
}
test('debounces names of four characters and reuses cached answers',async()=>{
 const h=harness(async()=> 'biology');h.model.nameChanged(' Bio ');assert.equal(h.timer,undefined);
 h.model.nameChanged(' Biology ');assert.equal(h.timer.delay,700);assert.equal(h.calls.length,0);
 h.timer.callback();await tick();assert.equal(h.state.topicKey,'biology');assert.equal(await h.model.resolve('Biology'),'biology');assert.equal(h.calls.length,1);
 h.model.nameChanged('Other');h.model.nameChanged('Biology');assert.equal(h.state.phase,'suggested');assert.equal(h.calls.length,1);
});
test('submission starts immediately and shares a running suggestion',async()=>{
 const work=deferred(),h=harness(()=>work.promise);h.model.nameChanged('Biology');
 const first=h.model.resolve('Biology'),second=h.model.resolve('Biology');await tick();assert.equal(h.calls.length,1);assert.equal(h.timer,null);
 work.resolve('biology');assert.equal(await first,'biology');assert.equal(await second,'biology');
});
test('late responses cannot replace a newer name',async()=>{
 const a=deferred(),b=deferred(),h=harness(name=>name==='Biology'?a.promise:b.promise);
 const first=h.model.resolve('Biology').catch(error=>error);await tick();const second=h.model.resolve('Spanish');await tick();
 assert.equal(h.calls[0].signal.aborted,true);b.resolve('languages');await second;a.resolve('biology');assert.equal((await first).name,'AbortError');assert.equal(h.state.topicKey,'languages');
});
test('manual selection and closing cancel pending suggestions',async()=>{
 const work=deferred(),h=harness(()=>work.promise),pending=h.model.resolve('Biology').catch(error=>error);await tick();h.model.cancel();work.resolve('biology');assert.equal((await pending).name,'AbortError');assert.equal(h.model.stateFor('Biology').phase,'idle');
});
test('account changes discard pending answers and cached topics',async()=>{
 const work=deferred(),h=harness(()=>work.promise),pending=h.model.resolve('Biology').catch(error=>error);await tick();h.setOwner('bob');work.resolve('biology');assert.equal((await pending).name,'AbortError');assert.equal(h.model.stateFor('Biology').phase,'idle');
});
test('classifier failure clears reading state and can be retried',async()=>{
 let fails=true;const h=harness(()=>{if(fails)throw new Error('offline');return 'biology';});
 await assert.rejects(h.model.resolve('Biology'),/offline/);assert.equal(h.state.phase,'idle');fails=false;assert.equal(await h.model.resolve('Biology'),'biology');
});
