import {muxMP4} from './mux.js';
/** Public, anonymous YouTube extraction. No proxy or executable player scripts. */
export const MAX_MEDIA_BYTES=50*1024*1024;
export function playerRequest(html,id){
  // This is anonymous context issued with the public watch page, never an account cookie.
  const match=html.match(/"VISITOR_DATA"\s*:\s*("(?:[^"\\]|\\.)*")/);
  const visitor=match?JSON.parse(match[1]):undefined;
  if(!visitor)throw Error('YouTube did not provide anonymous visitor context. Try again later.');
  return {headers:{'Content-Type':'application/json','X-YouTube-Client-Name':'101','X-YouTube-Client-Version':'1.02','X-Goog-Visitor-Id':visitor},
    body:JSON.stringify({context:{client:{clientName:'VISIONOS',clientVersion:'1.02',deviceMake:'Apple',deviceModel:'RealityDevice17,1',osName:'visionOS',osVersion:'26.5.23O471',hl:'en',timeZone:'UTC',utcOffsetMinutes:0}},videoId:id,playbackContext:{contentPlaybackContext:{html5Preference:'HTML5_PREF_WANTS'}},contentCheckOk:true,racyCheckOk:true})};
}
export function parseInput(value) {
  const u=new URL(value.trim());
  if(u.protocol!=='https:'||u.username||u.password||u.port)throw Error('Use an HTTPS YouTube URL.');
  if(!['youtube.com','www.youtube.com','music.youtube.com','m.youtube.com','youtu.be'].includes(u.hostname))throw Error('Use a YouTube video or playlist URL.');
  let id=u.hostname==='youtu.be'?u.pathname.slice(1):u.pathname==='/watch'?u.searchParams.get('v'): /^\/(shorts|live)\//.test(u.pathname)?u.pathname.split('/')[2]:null;
  const playlist=u.searchParams.get('list');
  if(id&&!/^[A-Za-z0-9_-]{11}$/.test(id))throw Error('Invalid video ID.');
  if(playlist==='LM'||playlist==='LL')throw Error('This is a personal liked-items queue. Sign-in is required and is planned for phase 2. Use a public playlist URL for now.');
  if(playlist&&!/^[A-Za-z0-9_-]{10,100}$/.test(playlist))throw Error('Invalid playlist ID.');
  if(!id&&!playlist)throw Error('Missing video or playlist ID.');
  return {id,playlist,radio:!!playlist&&playlist.startsWith('RD')&&!playlist.startsWith('RDCLAK')};
}
export function allowedHost(value){const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password&&!u.port&&(u.hostname==='www.youtube.com'||u.hostname.endsWith('.googlevideo.com')||u.hostname==='googlevideo.com');}
export function readJSON(html,name){
  const pattern=new RegExp('(?:var\\s+)?'+name+'\\s*=\\s*');const m=pattern.exec(html);
  if(!m)throw Error('YouTube response did not contain '+name+'.');
  let start=html.indexOf('{',m.index+m[0].length),depth=0,string=false,escaped=false;
  if(start<0)throw Error('Missing JSON data.');
  for(let i=start;i<html.length;i++){const c=html[i];if(string){if(escaped)escaped=false;else if(c==='\\')escaped=true;else if(c==='"')string=false;}else{if(c==='"')string=true;else if(c==='{')depth++;else if(c==='}'&&--depth===0)return JSON.parse(html.slice(start,i+1));}}
  throw Error('Incomplete YouTube response.');
}
export function playlistPage(data){
  const items=[],tokens=[];
  function walk(node){if(!node||typeof node!=='object')return;if(node.playlistPanelVideoRenderer){const v=node.playlistPanelVideoRenderer;if(v.videoId)items.push({id:v.videoId,title:v.title?.simpleText||v.title?.runs?.map(r=>r.text).join('')||v.videoId});return;}if(node.nextContinuationData){tokens.push(node.nextContinuationData.continuation);return;}if(node.lockupViewModel){const v=node.lockupViewModel;if(v.contentType==='LOCKUP_CONTENT_TYPE_VIDEO'&&/^[A-Za-z0-9_-]{11}$/.test(v.contentId||''))items.push({id:v.contentId,title:v.metadata?.lockupMetadataViewModel?.title?.content||v.contentId});return;}if(node.playlistVideoRenderer){const v=node.playlistVideoRenderer;if(v.videoId)items.push({id:v.videoId,title:v.title?.runs?.map(r=>r.text).join('')||v.title?.simpleText||v.videoId});return;}
    if(node.continuationItemRenderer){const t=node.continuationItemRenderer.continuationEndpoint?.continuationCommand?.token;if(t)tokens.push(t);return;}
    for(const v of Object.values(node)){if(Array.isArray(v))v.forEach(walk);else if(v&&typeof v==='object')walk(v);}}
  walk(data);return {items,continuation:tokens.at(-1)};
}
export function selectStream(data,kind){
  if(data.playabilityStatus?.status!=='OK')throw Object.assign(Error(data.playabilityStatus?.reason||'This media is not available without sign-in.'),{code:data.playabilityStatus?.status});
  if(data.videoDetails?.isLiveContent)throw Error('Live content is not supported in phase 1.');
  const streams=[...(data.streamingData?.formats||[]),...(data.streamingData?.adaptiveFormats||[])];
  const candidates=streams.filter(f=>f.url&&allowedHost(f.url)&&!f.drmFamilies?.length&&(kind==='mp4'?f.mimeType?.startsWith('video/mp4')&&!!f.audioQuality:f.mimeType?.startsWith('audio/')));
  candidates.sort((a,b)=>(kind==='mp4'?(b.height||0)-(a.height||0):Number(b.mimeType.startsWith('audio/mp4'))-Number(a.mimeType.startsWith('audio/mp4'))||(b.bitrate||0)-(a.bitrate||0)));
  if(!candidates.length)throw Error(kind==='mp4'?'No progressive MP4 with picture and sound is available.':'No direct audio stream is available. This source requires extraction features not supported in this build.');
  return candidates[0];
}
export function selectTrackPair(data){
  if(data.playabilityStatus?.status!=='OK')throw Object.assign(Error(data.playabilityStatus?.reason||'This media is unavailable.'),{code:data.playabilityStatus?.status});
  const streams=(data.streamingData?.adaptiveFormats||[]).filter(f=>f.url&&allowedHost(f.url)&&!f.drmFamilies?.length&&Number(f.contentLength)>0);
  const audio=streams.filter(f=>f.mimeType?.startsWith('audio/mp4')&&f.mimeType.includes('mp4a.40.2')).sort((a,b)=>(b.bitrate||0)-(a.bitrate||0))[0];
  const video=streams.filter(f=>audio&&f.mimeType?.startsWith('video/mp4')&&f.mimeType.includes('avc1')&&Number(f.contentLength)+Number(audio.contentLength)+1048576<MAX_MEDIA_BYTES)
    .sort((a,b)=>Number((b.height||0)<=720)-Number((a.height||0)<=720)||(b.height||0)-(a.height||0))[0];
  if(!audio||!video)throw Error('No compatible MP4 with picture and sound fits the 50 MiB device limit. Try a shorter video.');
  return {video,audio};
}
export class Downloader {
  constructor({fetcher=globalThis.fetch,onProgress=()=>{}}={}){this.fetcher=fetcher;this.onProgress=onProgress;}
  async request(url,options={}){
    if(!allowedHost(url))throw Error('Blocked unexpected network host.');
    try{const response=await this.fetcher(url,{...options,credentials:'omit',referrerPolicy:'no-referrer'});if(response.url&&!allowedHost(response.url))throw Error('Redirected outside the approved hosts.');if(!response.ok)throw Error('YouTube request returned HTTP '+response.status+'.');return response;}
    catch(e){if(e.name==='AbortError')throw e;if(e instanceof TypeError)throw Error('Network request blocked or unavailable. Check YouTube and *.googlevideo.com approval, CORS/native networking, and your connection.');throw e;}
  }
  async *playlist(input,signal){
    if(!input.playlist){yield {id:input.id,title:input.id};return;}
    const radio=input.radio;
    let initial,version='2.20260708.05.00';
    if(radio){
      const html=await(await this.request('https://www.youtube.com/watch?v='+encodeURIComponent(input.id||input.playlist.slice(2))+'&list='+encodeURIComponent(input.playlist)+'&start_radio=1',{signal})).text();
      initial=readJSON(html,'ytInitialData');version=html.match(/"INNERTUBE_CLIENT_VERSION"\s*:\s*"([^"]+)"/)?.[1]||version;
    }else{
      // Public playlist metadata does not need a cookie-consent page or account session.
      const response=await this.request('https://www.youtube.com/youtubei/v1/browse?prettyPrint=false',{method:'POST',signal,headers:{'Content-Type':'application/json','X-YouTube-Client-Name':'1','X-YouTube-Client-Version':version},body:JSON.stringify({context:{client:{clientName:'WEB',clientVersion:version,hl:'en',timeZone:'UTC',utcOffsetMinutes:0}},browseId:'VL'+input.playlist})});
      initial=await response.json();
    }
    const root=radio?initial.contents?.twoColumnWatchNextResults?.playlist?.playlist:initial;
    if(radio&&!root)throw Error('YouTube did not return a public radio queue for this link.');
    let page=playlistPage(root);const seen=new Set();let count=0;
    for(let index=0;index<100;index++){
      for(const item of page.items){signal?.throwIfAborted();if(!seen.has(item.id)){seen.add(item.id);yield item;if(++count>=500)throw Error('Reached the 500-item safety limit.');}}
      if(!page.continuation){if(!count)throw Error('Playlist is empty, private, or not exposed by YouTube. OAuth is not enabled in phase 1.');return;}
      if(!version)throw Error('Playlist continuation requires a client version that was not provided.');
      const response=await this.request('https://www.youtube.com/youtubei/v1/'+(radio?'next':'browse')+'?prettyPrint=false',{method:'POST',signal,headers:{'Content-Type':'application/json'},body:JSON.stringify({context:{client:{clientName:'WEB',clientVersion:version}},continuation:page.continuation})});
      const next=await response.json();page=playlistPage(radio?(next.continuationContents?.playlistPanelContinuation||next.contents?.twoColumnWatchNextResults?.playlist?.playlist||{}):next);
    }
    throw Error('Playlist continuation limit reached.');
  }
  async media(id,kind,signal){
    const html=await(await this.request('https://www.youtube.com/watch?v='+id,{signal})).text();
    let data=readJSON(html,'ytInitialPlayerResponse'),stream;
    let pair;
    try{stream=selectStream(data,kind);}catch{
      const response=await this.request('https://www.youtube.com/youtubei/v1/player?prettyPrint=false',{method:'POST',signal,...playerRequest(html,id)});
      data=await response.json();
      try{stream=selectStream(data,kind);}catch(e){if(kind!=='mp4'||data.playabilityStatus?.status!=='OK')throw e;pair=selectTrackPair(data);}
    }
    if(kind==='mp3'&&Number(data.videoDetails?.lengthSeconds||0)>600)throw Error('MP3 conversion is limited to ten minutes to protect phone memory.');
    const blob=pair?await muxMP4(await this.download(pair.video,signal),await this.download(pair.audio,signal),{signal}):await this.download(stream,signal);
    return {id,title:data.videoDetails?.title||id,blob,duration:Number(data.videoDetails?.lengthSeconds||0)};
  }
  async download(stream,signal){
    const total=Number(stream.contentLength||0),max=MAX_MEDIA_BYTES;
    if(total>max)throw Error('This file exceeds the 50 MiB on-device limit.');
    // Explicit bounded ranges prevent YouTube from throttling whole-file responses.
    if(total){
      const chunks=[];let loaded=0;
      while(loaded<total){
        signal?.throwIfAborted();const end=Math.min(total-1,loaded+4*1024*1024-1),url=new URL(stream.url);url.searchParams.set('range',loaded+'-'+end);
        const response=await this.request(url.href,{signal}),bytes=await response.arrayBuffer();
        if(bytes.byteLength!==end-loaded+1)throw Error('YouTube returned an incomplete media range. Please retry.');
        chunks.push(bytes);loaded+=bytes.byteLength;this.onProgress({loaded,total});
      }
      return new Blob(chunks,{type:stream.mimeType.split(';')[0]});
    }
    const response=await this.request(stream.url,{signal}),declared=Number(response.headers.get('content-length')||0);
    if(declared>max){await response.body?.cancel();throw Error('This file exceeds the 50 MiB on-device limit.');}
    const reader=response.body.getReader(),chunks=[];let loaded=0;
    try{for(;;){signal?.throwIfAborted();const {done,value}=await reader.read();if(done)break;loaded+=value.length;if(loaded>max)throw Error('File exceeded the 50 MiB limit.');chunks.push(value);this.onProgress({loaded,total});}}
    catch(e){await reader.cancel().catch(()=>{});throw e;}finally{reader.releaseLock();}
    if(!loaded)throw Error('The source returned an empty file.');
    if(declared&&declared!==loaded)throw Error('YouTube returned an incomplete media file. Please retry.');
    return new Blob(chunks,{type:stream.mimeType.split(';')[0]});
  }
}
