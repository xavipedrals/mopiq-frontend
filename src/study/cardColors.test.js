import assert from 'node:assert/strict';
import { it } from 'node:test';
import { cssColorChannels, lightBackdrop, readableForeground } from './cardColors.js';
it('keeps dark text on bright annotations and adapts dark ink on dark cards',()=>{
  assert.deepEqual(cssColorChannels('#fff'),[255,255,255,1]);
  assert.deepEqual(cssColorChannels('rgb(255, 255, 0)'),[255,255,0,1]);
  assert.equal(lightBackdrop('yellow'),true);assert.equal(lightBackdrop('rgba(255,255,0,0)'),null);
  assert.equal(lightBackdrop('#00000000'),null);
  assert.equal(readableForeground('black',true),'black');
  assert.equal(readableForeground('white',true),'#1e293d');
  assert.equal(readableForeground('black',false),'rgb(166, 166, 166)');
});
