import assert from 'node:assert/strict';
import { chromium, webkit } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { dirname,join } from 'node:path';
import { fileURLToPath } from 'node:url';
const root=dirname(fileURLToPath(import.meta.url));
const base=process.env.WEB_PREVIEW_URL||'http://127.0.0.1:4180';
const cases=JSON.parse(await readFile(join(root,'word-fixtures/cases.json'),'utf8'));
for(const type of [chromium,webkit]){
 const browser=await type.launch({headless:true});
 try{
  const page=await browser.newPage();
  await page.route('**/*',route=>new URL(route.request().url()).origin===base?route.continue():route.fulfill({status:500,body:'{}'}));
  await page.goto(base+'/customScripts/preview_powerpoint_import.html?design=true');
  for(const sample of cases){
   const data=(await readFile(join(root,'word-fixtures',sample.file))).toString('base64');
   const result=await page.evaluate(async({data,name})=>{
    const {extractWord}=await import('/src/study/wordImport.js');
    const bytes=Uint8Array.from(atob(data),c=>c.charCodeAt(0));
    try{return await extractWord(new File([bytes],name));}catch(e){return {error:e.code||e.message};}
   },{data,name:sample.file});
   if(sample.error)assert.equal(result.error,sample.error,sample.id);
   else if(sample.invalid)assert.ok(result.error,sample.id);
   else assert.equal(result.text,sample.expected,sample.id);
   console.log(type.name(),sample.id,'passed');
  }
  const sample=cases[0],data=(await readFile(join(root,'word-fixtures',sample.file))).toString('base64');
  const aborted=await page.evaluate(async data=>{
   const {extractWord}=await import('/src/study/wordImport.js');const c=new AbortController();
   try{await extractWord(new File([Uint8Array.from(atob(data),c=>c.charCodeAt(0))],'notes.docx'),{signal:c.signal,onProgress:()=>c.abort()});return 'unexpected success';}catch(e){return e.name;}
  },data);
  assert.equal(aborted,'AbortError');console.log(type.name(),'cancelled extraction passed');
 }finally{await browser.close();}
}
