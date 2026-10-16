import { Mp3Encoder } from '@breezystack/lamejs';
export async function encodeMP3(blob,{signal,onProgress=()=>{}}={}){
  signal?.throwIfAborted();
  const context=new AudioContext();
  try{
    const decoded=await context.decodeAudioData(await blob.arrayBuffer());signal?.throwIfAborted();
    if(decoded.duration>600)throw Error('MP3 conversion is limited to ten minutes to protect phone memory.');
    const channels=Math.min(2,decoded.numberOfChannels),encoder=new Mp3Encoder(channels,decoded.sampleRate,192),chunks=[];
    const data=Array.from({length:channels},(_,i)=>decoded.getChannelData(i));
    for(let offset=0;offset<decoded.length;offset+=1152){
      signal?.throwIfAborted();
      const pcm=data.map(channel=>Int16Array.from(channel.subarray(offset,offset+1152),x=>Math.max(-1,Math.min(1,x))*(x<0?32768:32767)));
      const bytes=encoder.encodeBuffer(pcm[0],pcm[1]);if(bytes.length)chunks.push(new Uint8Array(bytes));
      if(offset%(1152*32)===0){onProgress(offset/decoded.length);await new Promise(r=>setTimeout(r,0));}
    }
    const tail=encoder.flush();if(tail.length)chunks.push(new Uint8Array(tail));
    return new Blob(chunks,{type:'audio/mpeg'});
  }finally{await context.close();}
}
