import test from 'node:test';import assert from 'node:assert/strict';
import {encodeMP3} from '../src/mp3.js';
const wave=Float32Array.from({length:44100},(_,i)=>Math.sin(2*Math.PI*440*i/44100)*.25);
class AudioFixture {async decodeAudioData(){return {duration:1,numberOfChannels:1,sampleRate:44100,length:wave.length,getChannelData:()=>wave};}async close(){}}
globalThis.AudioContext=AudioFixture;
test('pure JS encoder creates MP3 bytes from decoded PCM',async()=>{const blob=await encodeMP3(new Blob([new Uint8Array([0])]));const bytes=new Uint8Array(await blob.arrayBuffer());assert.equal(blob.type,'audio/mpeg');assert.ok(bytes.length>1000);assert.equal(bytes[0],255);assert.equal(bytes[1]&224,224);});
test('MP3 encoding observes cancellation',async()=>{const c=new AbortController();c.abort();await assert.rejects(encodeMP3(new Blob(),{signal:c.signal}),{name:'AbortError'});});
