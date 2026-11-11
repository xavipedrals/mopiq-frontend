import assert from 'node:assert/strict';
import { chromium, webkit } from '@playwright/test';
for (const type of [chromium, webkit]) {
 const browser = await type.launch({headless:true});
 try {
  const page = await browser.newPage();
  await page.goto('http://127.0.0.1:4187');
  await page.waitForFunction(()=>window.benchmarkReady);
  const result = await page.evaluate(async()=>{
   const {benchmarkFile}=await import('./extractor.js');
   const errors=[];
   for (const file of [new File(['not a pptx'],'notes.docx'),new File(['not a zip'],'broken.pptx')]) {
    try{await benchmarkFile(file);errors.push('unexpected success');}catch(e){errors.push(e.message);}
   }
   const response=await fetch('./samples/stress-300-text.pptx');
   const file=new File([await response.blob()],'stress.pptx');
   const controller=new AbortController();
   let slidesBeforeCancel=0;
   try {
    await benchmarkFile(file,{signal:controller.signal,onProgress(done){slidesBeforeCancel=done;if(done===5)controller.abort();}});
    errors.push('unexpected success');
   } catch(e){errors.push(e.name);}
   return {errors,slidesBeforeCancel};
  });
  assert.match(result.errors[0],/Choose a .pptx/);
  assert.match(result.errors[1],/End of central directory|not found|zip|format is not recognized/i);
  assert.equal(result.errors[2],'AbortError');
  assert.equal(result.slidesBeforeCancel,5);
  console.log(type.name(), 'wrong type / malformed file / cancellation: passed');
 } finally {await browser.close();}
}
