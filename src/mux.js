import {createFile,DataStream} from 'mp4box';

/** Assemble clear AVC/AAC tracks locally. Preserve encoded samples and timestamps. */
export async function muxMP4(video,audio,{signal,maxBytes=50*1024*1024}={}){
  const sources=[];
  for(const [blob,type] of [[video,'video'],[audio,'audio']]){
    signal?.throwIfAborted();
    const file=createFile(true),buffer=await blob.arrayBuffer();buffer.fileStart=0;
    let info,error;file.onReady=value=>info=value;file.onError=value=>error=value;
    file.appendBuffer(buffer);file.flush();
    const track=info?.tracks.find(t=>type==='video'?t.video:t.audio);
    if(error||!track||!track.nb_samples)throw Error('Could not read the complete '+type+' track.');
    const box=file.getTrackById(track.id),entry=box.mdia.minf.stbl.stsd.entries[0];
    if(!['avc1','mp4a'].includes(entry.type))throw Error('This media codec cannot be assembled into MP4.');
    sources.push({file,track,box,entry});
  }
  const output=createFile(),duration=Math.max(...sources.map(s=>s.track.duration/s.track.timescale));
  output.init({timescale:1000,duration:Math.ceil(duration*1000),brands:['isom','iso6','mp41']});
  for(const s of sources){
    s.id=output.addTrack({type:s.entry.type,timescale:s.track.timescale,media_duration:s.track.duration,duration:Math.ceil(s.track.duration/s.track.timescale*1000),
      width:s.track.video?.width,height:s.track.video?.height,hdlr:s.track.video?'vide':'soun',language:s.track.language,
      channel_count:s.track.audio?.channel_count,samplerate:s.track.audio?.sample_rate,samplesize:s.track.audio?.sample_size,description_boxes:s.entry.boxes});
    const track=output.getTrackById(s.id);track.first_dts=0;
    if(s.box.edts)track.addBox(s.box.edts);
  }
  const chunks=[output.getBuffer().buffer];let size=chunks[0].byteLength;
  // One second per fragment, interleaved by presentation time, keeps seeking useful.
  const groups=[];
  for(const s of sources){
    let group=[],second=-1;
    for(let i=0;i<s.track.nb_samples;i++){
      const sample=s.file.getTrackSample(s.track.id,i);
      if(!sample?.data)throw Error('The downloaded media track is incomplete.');
      const time=Math.floor(sample.dts/s.track.timescale);
      if(group.length&&time!==second){groups.push({s,second,samples:group});group=[];}
      second=time;group.push({...sample,track_id:s.id});
    }
    if(group.length)groups.push({s,second,samples:group});
  }
  groups.sort((a,b)=>a.second-b.second||a.s.id-b.s.id);
  for(let i=0;i<groups.length;i++){
    signal?.throwIfAborted();
    const {samples}=groups[i],moof=output.createMoof(samples);moof.computeSize();moof.trafs[0].truns[0].data_offset=moof.size+8;
    const stream=new DataStream();moof.write(stream);
    const payload=samples.reduce((n,s)=>n+s.data.byteLength,0),header=new Uint8Array(8);new DataView(header.buffer).setUint32(0,payload+8);header.set([109,100,97,116],4);
    size+=stream.buffer.byteLength+8+payload;if(size>maxBytes)throw Error('The assembled MP4 exceeds the 50 MiB on-device limit.');
    chunks.push(stream.buffer,header,...samples.map(s=>s.data));
    if(i%32===0)await new Promise(resolve=>setTimeout(resolve,0));
  }
  return new Blob(chunks,{type:'video/mp4'});
}
