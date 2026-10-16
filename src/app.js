import {Downloader,parseInput} from './core.js';
import {encodeMP3} from './mp3.js';
import {createTransport} from './transport.js';
import {Library} from './library.js';
const $=id=>document.getElementById(id),library=new Library();
let controller,files=[],current=-1,playerURL,lastRemoved,all=false;
const urls=[];
const initialized=library.init().then(render);
if(window.parent!==window)Batiyao.ready().catch(()=>{});
function status(text){$('status').textContent=text;}
function screen(name){$('home').hidden=name!=='home';$('library').hidden=name!=='library';$('home-tab').setAttribute('aria-pressed',String(name==='home'));$('library-tab').setAttribute('aria-pressed',String(name==='library'));if(name==='library')render();else{$('player').pause();all=false;}}
$('home-tab').onclick=()=>screen('home');$('library-tab').onclick=()=>screen('library');
function format(){return document.querySelector('input[name=format]:checked').value;}
for(const r of document.querySelectorAll('input[name=format]'))r.onchange=()=>{$('start').textContent=r.value==='mp3'?'Download audio · MP3':'Download video · MP4';};
$('stop').onclick=()=>{controller?.abort();status('Stopping…');};
$('form').onsubmit=async event=>{
 event.preventDefault();if(controller)return;
 controller=new AbortController();const signal=controller.signal;let saved=0,skipped=0,failed=0;
 $('start').disabled=true;$('stop').hidden=false;$('queue').replaceChildren();$('progress').hidden=false;
 try{
  await initialized;const input=parseInput($('url').value),kind=format();
  const known=new Set((await library.list()).map(f=>f.key));
  const onProgress=({loaded,total})=>{if(total){$('progress').max=total;$('progress').value=loaded;}else $('progress').removeAttribute('value');};
  const engine=new Downloader({fetcher:createTransport({onProgress}),onProgress});
  status('Reading playlist…');
  for await(const item of engine.playlist(input,signal)){
   signal.throwIfAborted();const row=document.createElement('li');row.textContent=item.title;$('queue').append(row);
   const key=item.id+':'+kind;if(known.has(key)){skipped++;row.textContent+=' · already downloaded';continue;}
   try{
    status('Downloading '+item.title+'…');const media=await engine.media(item.id,kind,signal);
    if(kind==='mp3'){if(media.duration>600)throw Error('MP3 conversion is limited to ten minutes.');status('Encoding MP3 on this device…');media.blob=await encodeMP3(media.blob,{signal,onProgress:p=>{$('progress').max=1;$('progress').value=p;}});}
    signal.throwIfAborted();await library.put({...media,key,kind,added:Date.now()});known.add(key);saved++;row.textContent+=' · downloaded';await render();
   }catch(e){if(signal.aborted||e.code==='LOGIN_REQUIRED'||e.code==='NET_NOT_ALLOWED'||e.code==='NET_QUOTA'||e.message.includes('library is full')||e.message.includes('storage is full'))throw e;failed++;row.textContent+=' · '+e.message;}
  }
  status(saved+' downloaded · '+skipped+' skipped · '+failed+' unavailable. Open Library to play saved media.');
 }catch(e){status(controller.signal.aborted?'Stopped. Completed downloads remain in your library.':e.message);}
 finally{controller=undefined;$('start').disabled=false;$('stop').hidden=true;$('progress').hidden=true;}
};
function stopPlayback(){const p=$('player');p.pause();p.removeAttribute('src');p.load();p.hidden=true;if(playerURL)URL.revokeObjectURL(playerURL);playerURL=undefined;current=-1;all=false;}
function play(index,queue=true){if(!files[index])return;const f=files[index];current=index;all=queue;if(playerURL)URL.revokeObjectURL(playerURL);playerURL=URL.createObjectURL(f.blob);$('player').hidden=false;$('player').src=playerURL;$('library-status').textContent='Playing '+(index+1)+' of '+files.length+' · '+f.title;$('player').play().catch(()=>{$('library-status').textContent='Tap the media player to start.';});}
$('play-all').onclick=()=>play(0);$('player').onended=()=>{if(all&&current+1<files.length)play(current+1);else $('library-status').textContent='Playback finished.';};
$('player').onerror=()=>{$('library-status').textContent='This device cannot play this media format.';};
$('restore').onclick=async()=>{if(!lastRemoved)return;try{await library.put(lastRemoved);lastRemoved=undefined;$('undo').hidden=true;await render();}catch(e){$('library-status').textContent=e.message;}};
function action(label,fn){const b=document.createElement('button');b.textContent=label;b.onclick=()=>Promise.resolve(fn()).catch(e=>$('library-status').textContent=e.message);return b;}
async function render(){
 const active=files[current]?.key;files=(await library.list()).sort((a,b)=>a.added-b.added);current=files.findIndex(f=>f.key===active);$('count').textContent=files.length;$('play-all').disabled=!files.length;$('files').replaceChildren();urls.splice(0).forEach(u=>URL.revokeObjectURL(u));
 $('storage-note').textContent=library.native?'Downloads are saved privately on this device with Batiyao.':library.persistent?'Downloads are stored in this browser on this device.':'Session library: this host has no documented persistent media storage. Files are lost when the app closes.';
 for(const [index,f] of files.entries()){
  const row=document.createElement('li');row.className='file';const title=action(f.title,()=>play(index));title.className='title';
  const meta=document.createElement('p');meta.className='meta';meta.textContent=f.kind.toUpperCase()+' · '+(f.blob.size/1048576).toFixed(1)+' MB';
  const actions=document.createElement('div');actions.className='actions';
  const file=new File([f.blob],f.title.replace(/[^a-zA-Z0-9 _-]/g,'_').slice(0,80)+'.'+f.kind,{type:f.blob.type});
  if(library.native&&library.shareMedia){
   const share=action('Share',()=>Batiyao.share(f.kind==='mp3'?{audio:f.blob}:{video:f.blob}));
   const valid=f.kind==='mp3'?f.blob.size<=10*1048576&&f.duration<=300:f.blob.size<=20*1048576&&f.duration<=60;
   if(!valid){share.disabled=true;share.title=f.kind==='mp3'?'Batiyao sharing supports audio up to 10 MB / 5 minutes.':'Batiyao sharing supports video up to 20 MB / 60 seconds.';}
   actions.append(share);
  }
  if(window.parent===window){
   const u=URL.createObjectURL(f.blob);urls.push(u);const save=action('Save to Files',()=>{const a=document.createElement('a');a.href=u;a.download=file.name;a.click();});actions.append(save);
   if(navigator.canShare?.({files:[file]}))actions.append(action('Share',()=>navigator.share({files:[file],title:f.title})));
  }
  actions.append(action('Remove',async()=>{if(files[current]?.key===f.key)stopPlayback();await library.remove(f.key);lastRemoved=f;$('undo').hidden=false;await render();}));
  row.append(title,meta,actions);$('files').append(row);
 }
 if(!files.length){const empty=document.createElement('p');empty.textContent='Your downloads will appear here.';$('files').append(empty);}
}
if(window.parent!==window)Batiyao.on('visibility',event=>{if(!event.visible){$('player').pause();controller?.abort();}});
document.addEventListener('visibilitychange',()=>{if(document.hidden)$('player').pause();});
