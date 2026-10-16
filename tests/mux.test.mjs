import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';import {createFile} from 'mp4box';import {muxMP4} from '../src/mux.js';
const fixture=async name=>new Blob([await readFile(new URL('./fixtures/'+name,import.meta.url))]);
test('MP4 assembly retains both codecs, complete sample counts and timestamps',async()=>{
 const video=await fixture('video.mp4'),audio=await fixture('audio.m4a'),blob=await muxMP4(video,audio),file=createFile(true);let info;
 file.onReady=x=>info=x;const buffer=await blob.arrayBuffer();buffer.fileStart=0;file.appendBuffer(buffer);file.flush();
 assert.equal(blob.type,'video/mp4');assert.equal(info.tracks.length,2);assert.ok(info.tracks.some(t=>t.codec.startsWith('avc1')));assert.ok(info.tracks.some(t=>t.codec.startsWith('mp4a')));
 for(const track of info.tracks){const samples=file.getTrackSamplesInfo(track.id);assert.ok(samples.length>=3);assert.equal(samples[0].dts,0);assert.ok(samples.at(-1).cts>0);assert.ok(file.getTrackSample(track.id,samples.length-1).data.length);}
});
test('MP4 assembly obeys cancellation, rejects missing tracks and caps output size',async()=>{const video=await fixture('video.mp4'),audio=await fixture('audio.m4a'),c=new AbortController();c.abort();await assert.rejects(muxMP4(video,audio,{signal:c.signal}),/abort/i);await assert.rejects(muxMP4(video,video),/complete audio track/);await assert.rejects(muxMP4(video,audio,{maxBytes:100}),/device limit/);});
