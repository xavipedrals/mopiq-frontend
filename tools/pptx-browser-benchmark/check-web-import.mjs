import assert from 'node:assert/strict';
import { chromium, webkit } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const root=dirname(fileURLToPath(import.meta.url));
const source=process.env.IMPORT_SOURCE==='word'?'word':'powerpoint';
const extension=source==='word'?'docx':'pptx';
const base=process.env.WEB_PREVIEW_URL||'http://127.0.0.1:4179';
const manifest=JSON.parse(await readFile(join(root,'samples/manifest.json'),'utf8'));
const authMock=`const user={supabaseUid:'preview-owner',firebaseUid:'preview-firebase'};export const authReady=Promise.resolve();export const getCurrentUser=()=>user;export const getAccessToken=async()=>'preview-token';export const isLoggedIn=()=>true;export const onSessionChange=()=>()=>{};export const logout=async()=>{};export const deleteFirebaseUser=async()=>{};`;
for(const type of [chromium,webkit]) {
 const browser=await type.launch({headless:true});
 try {
  for(const shared of [false,true]) {
   for(const existing of [false,true]) {
    const context=await browser.newContext({viewport:{width:1000,height:900}});
    const page=await context.newPage();
    const starts=[],uploads=[],pageErrors=[];
    page.on('pageerror',e=>pageErrors.push(e.message));
    await page.route('**/*',async route=>{
     const req=route.request(),url=new URL(req.url());
     if(url.pathname==='/src/auth/session.js') return route.fulfill({contentType:'text/javascript',body:authMock});
     if(url.pathname==='/src/api/aiGeneration.js') {
      const response=await route.fetch();
      const body=(await response.text()).replace(/export const sharedGenerationEnabled = [^;]+;/,`export const sharedGenerationEnabled = ${shared};`);
      return route.fulfill({response,body});
     }
     if(url.pathname.includes('/storage/v1/object')) {uploads.push(req.url());return route.fulfill({status:500,body:'No source uploads allowed'});}
     if(url.pathname.includes('/functions/v1/')) {
      starts.push({path:url.pathname,body:req.postDataJSON()});
      return route.fulfill({contentType:'application/json',body:JSON.stringify({deckId:existing?'existing-deck':'new-deck',jobId:'preview-job',status:'queued'})});
     }
     if(url.origin===base) return route.continue();
     return route.fulfill({status:500,contentType:'application/json',body:JSON.stringify({error:'Preview: backend reads disabled'})});
    });
    try {
     await page.goto(`${base}/customScripts/preview_powerpoint_import.html?existing=${existing}&source=${source}`);
     await page.waitForFunction(()=>window.previewReady);
     // Bad archives must leave the picker usable and never start a job.
     await page.locator('input[type=file]').setInputFiles({name:'broken.'+extension,mimeType:'application/vnd.openxmlformats-officedocument.presentationml.presentation',buffer:Buffer.from('not a ZIP')});
     await page.locator('.form-error').waitFor();
     assert.match(await page.locator('.form-error').innerText(),/couldn't open this (PowerPoint|Word document)/);
     assert.equal(starts.length,0);
     const sample=source==='word'?{file:'Biology Lecture Notes.docx'}:manifest.find(s=>s.id==='stanford-javascript-basics');
     await page.locator('input[type=file]').setInputFiles(join(root,source==='word'?'word-fixtures':'samples',sample.file));
     await page.locator('.preparation').waitFor();
     await page.waitForFunction(existing=>existing?window.submitted:window.completed,existing,{timeout:30000});
     assert.equal(starts.length,1);
     assert.equal(uploads.length,0);
     const request=starts[0];
     assert.ok(request.path.endsWith(shared?'start_ai_generation_v1':'create_deck_from_text'));
     assert.equal(request.body.sourceKind,shared?source:'paste');
     if(source==='word')assert.match(request.body.text,/Biology lecture notes[\s\S]*Lesson 2299/);
     else {assert.equal(request.body.text.length,sample.characters);assert.match(request.body.text,/Notes:/);}
     assert.equal(request.body.storagePath??null,null);
     if(existing) assert.equal(request.body.deckVersionId,'existing-deck');
     assert.deepEqual(pageErrors,[]);
     console.log(type.name(),source,shared?'shared':'legacy',existing?'existing deck':'new deck',': preparation, malformed-file recovery, text-only submission passed');
    } catch (error) { console.log('Preview state:', await page.evaluate(() => ({ text: document.body.innerText, ready: window.previewReady, current: window.preview?.$refs?.sheet?.$data })).catch(() => null)); console.log('Page errors:', pageErrors); throw error; } finally {await context.close();}
   }
  }
 } finally {await browser.close();}
}
