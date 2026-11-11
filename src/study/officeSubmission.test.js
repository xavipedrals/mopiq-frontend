import assert from 'node:assert/strict';
import { test } from 'node:test';
import { preparedOfficeSubmission } from './officeSubmission.js';
import { sharedGenerationRequest } from './sharedGeneration.js';
const payload = { source:'word',file:{name:'notes.docx'},deckId:'deck',targetSubdeckId:42,name:'Notes',topic:'science',generationInstructions:'Focus on key terms.' };
test('DOCX text uses the legacy paste contract and preserves its destination without a source upload',()=>{
 const result=preparedOfficeSubmission(payload,'Cells produce ATP. '.repeat(20));
 assert.equal(result.source,'paste');assert.equal(result.file,null);assert.equal(result.pages,null);
 assert.equal(result.deckId,'deck');assert.equal(result.targetSubdeckId,42);assert.equal(result.name,'Notes');
});
test('shared DOCX generation retains Word identity, notes mode and generation instructions',()=>{
 const request=sharedGenerationRequest({...preparedOfficeSubmission(payload,'Cellular biology',true),requestId:'request'});
 assert.equal(request.sourceKind,'word');assert.equal(request.storagePath,null);assert.equal(request.mode,'notes');assert.equal(request.generationInstructions,payload.generationInstructions);
});
test('DOCX source limits produce document-specific errors before starting a job',()=>{
 for(const [text,code] of [['','docx_empty'],['Too short','docx_too_short'],['x'.repeat(400001),'docx_too_long']])assert.throws(()=>preparedOfficeSubmission(payload,text),{code});
 assert.throws(()=>preparedOfficeSubmission(payload,'x'.repeat(4000001),true),{code:'docx_too_long'});
});
