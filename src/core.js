/** Browser-only, direct-stream YouTube extractor. No proxy or executable player scripts. */
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
  candidates.sort((a,b)=>(kind==='mp4'?(b.height||0)-(a.height||0):(b.bitrate||0)-(a.bitrate||0)));
  if(!candidates.length)throw Error(kind==='mp4'?'No direct MP4 with picture and sound is available. Separate-track merging and ciphered streams are not supported in this build.':'No direct audio stream is available. This source requires extraction features not supported in this build.');
  return candidates[0];
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
    const pageURL=radio?'https://www.youtube.com/watch?v='+encodeURIComponent(input.id||input.playlist.slice(2))+'&list='+encodeURIComponent(input.playlist)+'&start_radio=1':'https://www.youtube.com/playlist?list='+encodeURIComponent(input.playlist);
    const html=await(await this.request(pageURL,{signal})).text();
    const initial=readJSON(html,'ytInitialData');
    const root=radio?initial.contents?.twoColumnWatchNextResults?.playlist?.playlist:initial;
    if(radio&&!root)throw Error('YouTube did not return a public radio queue for this link.');
    let page=playlistPage(root);const seen=new Set();let count=0;
    const version=html.match(/"INNERTUBE_CLIENT_VERSION"\s*:\s*"([^"]+)"/)?.[1];
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
    if(data.playabilityStatus?.status!=='OK')throw Object.assign(Error(data.playabilityStatus?.reason||'This media requires sign-in.'),{code:data.playabilityStatus?.status});
    try{stream=selectStream(data,kind);}catch{
      const response=await this.request('https://www.youtube.com/youtubei/v1/player?prettyPrint=false',{method:'POST',signal,headers:{'Content-Type':'application/json'},body:JSON.stringify({context:{client:{clientName:'ANDROID_VR',clientVersion:'1.65.10',deviceMake:'Oculus',deviceModel:'Quest 3',androidSdkVersion:32,osName:'Android',osVersion:'12L',hl:'en'}},videoId:id})});
      data=await response.json();stream=selectStream(data,kind);
    }
    if(kind==='mp3'&&Number(data.videoDetails?.lengthSeconds||0)>600)throw Error('MP3 conversion is limited to ten minutes to protect phone memory.');
    const response=await this.request(stream.url,{signal});
    const max=50*1024*1024,total=Number(response.headers.get('content-length')||stream.contentLength||0);
    if(total>max){await response.body?.cancel();throw Error('This file exceeds the 50 MiB on-device limit.');}
    const reader=response.body.getReader(),chunks=[];let loaded=0;
    try{for(;;){signal?.throwIfAborted();const {done,value}=await reader.read();if(done)break;loaded+=value.length;if(loaded>max)throw Error('File exceeded the 50 MiB limit.');chunks.push(value);this.onProgress({loaded,total});}}
    catch(e){await reader.cancel().catch(()=>{});throw e;}finally{reader.releaseLock();}
    if(!loaded)throw Error('The source returned an empty file.');
    return {id,title:data.videoDetails?.title||id,blob:new Blob(chunks,{type:stream.mimeType.split(';')[0]}),duration:Number(data.videoDetails?.lengthSeconds||0)};
  }
}
