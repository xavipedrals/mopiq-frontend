import assert from 'node:assert/strict';
import {chromium,webkit} from '@playwright/test';
const base=process.env.WEB_PREVIEW_URL||'http://127.0.0.1:4180';
const auth=`export let user={supabaseUid:'preview-owner',firebaseUid:'preview-firebase'};export const authReady=Promise.resolve();export const getCurrentUser=()=>user;export const getAccessToken=async()=>'preview-token';export const isLoggedIn=()=>true;export const onSessionChange=()=>()=>{};export const logout=async()=>{};export const deleteFirebaseUser=async()=>{};`;
for(const type of [chromium,webkit]){
 const browser=await type.launch();
 try{
  for(const scenario of ['automatic','manual','failure','settings','unsupported','close','stale']){
   const context=await browser.newContext({viewport:{width:1050,height:1000}}),page=await context.newPage();
   const requests=[],errors=[];page.on('pageerror',error=>errors.push(error.message));
   await page.route('**/*',async route=>{
    const req=route.request(),url=new URL(req.url());
    if(url.pathname==='/src/auth/session.js')return route.fulfill({contentType:'text/javascript',body:auth});
    if(url.pathname==='/src/api/personalDeckTopics.js')return route.fulfill({contentType:'text/javascript',body:`export const supportsPersonalDeckTopics=async()=>${scenario!=='unsupported'};export const hydratePersonalDeckTopics=async d=>d;export const savePersonalDeckTopic=async(d,key)=>({...d,personalTopicKey:key});`});
    if(url.pathname==='/src/api/mopiq.js'){
     const response=await route.fetch(),body=(await response.text()).replace(/export async function createDeck\(\{ name, topic \}\) \{/,`export async function createDeck({ name, topic }) { window.testCreate={name,topic}; return {id:'test-deck',name,topic}; }\nasync function unusedCreateDeck({ name, topic }) {`).replace(/export async function saveDeckSettings\(deck, settings\) \{/,`export async function saveDeckSettings(deck, settings) { window.testSettings=settings; return {}; }\nasync function unusedSaveDeckSettings(deck, settings) {`);
     return route.fulfill({response,body});
    }
    if(url.pathname.endsWith('/categorize_deck_topic')){
     requests.push(req.postDataJSON());
     if(scenario==='manual'||scenario==='close'||scenario==='stale')await new Promise(resolve=>setTimeout(resolve,900));
     return route.fulfill({status:scenario==='failure'?503:200,contentType:'application/json',body:JSON.stringify({topic:scenario==='unsupported'?'finance':req.postDataJSON().name.startsWith('Spanish')?'languages':'biology'})}).catch(()=>{});
    }
    if(url.origin===base)return route.continue();
    return route.fulfill({status:500,contentType:'application/json',body:'{}'});
   });
   try{
    await page.goto(base+'/customScripts/preview_deck_topics.html'+(scenario==='settings'?'?settings=true':''));await page.waitForFunction(()=>window.previewReady);
    if(scenario==='settings'){
     await page.locator('.topic-trigger').click();await page.locator('.automatic-row').click();
     if(type===chromium){await page.waitForFunction(()=>window.preview.$refs.sheet.topicSuggestion.phase==='suggested');for(const theme of ['light','dark']){await page.evaluate(theme=>{document.documentElement.dataset.theme=theme;},theme);await page.locator('.sheet').screenshot({path:`/private/tmp/mopiq-topic-settings-${theme}.png`});}}
     await page.locator('.picker-layer .save-button').click();await page.locator('.picker-layer').waitFor({state:'hidden'});assert.match(await page.locator('.topic-value').innerText(),/Biology/);await page.locator('.sheet-actions > .save-button').click();await page.waitForFunction(()=>window.testSettings);assert.equal(await page.evaluate(()=>window.testSettings.topic),'biology');
    }else{
     await page.locator('input[type=text]').fill('Biology Revision');
     if(scenario==='manual'){
      await page.waitForFunction(()=>window.preview.$refs.sheet.topicSuggestion.phase==='reading');await page.locator('.name-topic-row').click();await page.getByRole('option',{name:'Chemistry',exact:true}).click();await page.locator('.topic-step .primary-btn').click();await page.waitForTimeout(1000);assert.match(await page.locator('.name-topic-row').innerText(),/Chemistry/);
     }else if(scenario==='close'){
      await page.waitForFunction(()=>window.preview.$refs.sheet.topicSuggestion.phase==='reading');await page.evaluate(()=>{window.preview.open=false;});await page.waitForTimeout(1000);assert.equal(await page.evaluate(()=>window.testCreate),undefined);
     }else if(scenario==='stale'){
      await page.waitForFunction(()=>window.preview.$refs.sheet.topicSuggestion.phase==='reading');await page.locator('input[type=text]').fill('Spanish Vocabulary');await page.waitForFunction(()=>window.preview.$refs.sheet.topicSuggestion.topicKey==='languages');assert.match(await page.locator('.name-topic-row').innerText(),/Languages/);
     }else if(scenario==='automatic'){
      await page.waitForFunction(()=>window.preview.$refs.sheet.topicSuggestion.phase==='suggested');
      if(type===chromium){for(const theme of ['light','dark']){await page.evaluate(theme=>{document.documentElement.dataset.theme=theme;},theme);await page.locator('.sheet').screenshot({path:`/private/tmp/mopiq-topic-name-${theme}.png`});}}
      assert.match(await page.locator('.name-topic-row').innerText(),/Picked by AI/);await page.locator('.name-topic-row').click();assert.match(await page.locator('.automatic-row').innerText(),/AI thinks it's Biology/);
      if(type===chromium){for(const theme of ['light','dark']){await page.evaluate(theme=>{document.documentElement.dataset.theme=theme;},theme);await page.locator('.sheet').screenshot({path:`/private/tmp/mopiq-topic-picker-${theme}.png`});}}
      await page.locator('.topic-step .primary-btn').click();
     }
     if(scenario!=='close'){
      await page.locator('.step > .primary-btn').click();await page.waitForFunction(()=>window.testCreate);assert.equal(await page.evaluate(()=>window.testCreate.topic),scenario==='manual'?'chemistry':['failure','unsupported'].includes(scenario)?'other':scenario==='stale'?'languages':'biology');
      if(scenario==='automatic')assert.equal(requests.length,1);
     }
    }
    assert.deepEqual(errors,[]);console.log(type.name(),scenario,'passed');
   }catch(error){console.log(await page.locator('body').innerText(),errors);throw error;}finally{await context.close();}
  }
 }finally{await browser.close();}
}
