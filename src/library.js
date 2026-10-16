export class Library {
  constructor({sdk=globalThis.Batiyao,embedded=globalThis.origin==='null'}={}){this.memory=new Map();this.persistent=false;this.sdk=sdk;this.embedded=embedded;this.native=false;this.shareMedia=false;}
  async init(){
    if(this.embedded){
      if(this.sdk){this.native=await this.sdk.supports('files');this.shareMedia=await this.sdk.supports('shareMedia');this.persistent=this.native;}
      return;
    }
    try{this.db=await new Promise((resolve,reject)=>{const r=indexedDB.open('ytdl-web-media',1);r.onupgradeneeded=()=>r.result.createObjectStore('media',{keyPath:'key'});r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});this.persistent=true;}catch{}
  }
  async run(mode,fn){return new Promise((resolve,reject)=>{const t=this.db.transaction('media',mode),r=fn(t.objectStore('media'));t.oncomplete=()=>resolve(r.result);t.onerror=()=>reject(Error('Device storage is full or unavailable.'));});}
  async list(){
    if(this.native){const result=[];for(const entry of await this.sdk.files.list()){
      const match=/^ytdl_([A-Za-z0-9_-]{11})_(mp3|mp4)\.(mp3|mp4)$/.exec(entry.name);if(!match)continue;
      const stored=await this.sdk.files.get(entry.name);if(!stored.file)continue;
      let meta={};try{meta=JSON.parse(await this.sdk.storage.get('meta:'+entry.name)||'{}');}catch{}
      result.push({...meta,key:match[1]+':'+match[2],id:match[1],kind:match[2],title:meta.title||match[1],added:meta.added||Date.parse(entry.saved_at)||0,blob:stored.file});
    }return result;}
    return this.persistent?this.run('readonly',s=>s.getAll()):[...this.memory.values()];}
  async put(item){if(this.native){
      const name='ytdl_'+item.id+'_'+item.kind+'.'+item.kind;
      await this.sdk.files.save(name,item.blob);
      // Media identity remains recoverable from the filename if metadata storage fails.
      try{await this.sdk.storage.set('meta:'+name,JSON.stringify({title:item.title,added:item.added,duration:item.duration}));}catch{}
      return;
    }if(this.persistent)await this.run('readwrite',s=>s.put(item));else{const total=[...this.memory.values()].reduce((n,f)=>n+f.blob.size,0);if(total+item.blob.size>128*1024*1024)throw Error('Session library is full (128 MiB). Save/share files and remove items to continue.');this.memory.set(item.key,item);}}
  async remove(key){if(this.native){const [id,kind]=key.split(':');const name='ytdl_'+id+'_'+kind+'.'+kind;await this.sdk.files.remove(name);await this.sdk.storage.remove('meta:'+name).catch(()=>{});return;}if(this.persistent)await this.run('readwrite',s=>s.delete(key));else this.memory.delete(key);}
}
