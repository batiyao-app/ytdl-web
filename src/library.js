export class Library {
  constructor(){this.memory=new Map();this.persistent=false;}
  async init(){
    // Batiyao's opaque-origin sandbox cannot use IndexedDB. No fabricated SDK storage API.
    if(globalThis.origin==='null')return;
    try{this.db=await new Promise((resolve,reject)=>{const r=indexedDB.open('ytdl-web-media',1);r.onupgradeneeded=()=>r.result.createObjectStore('media',{keyPath:'key'});r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});this.persistent=true;}catch{}
  }
  async run(mode,fn){return new Promise((resolve,reject)=>{const t=this.db.transaction('media',mode),r=fn(t.objectStore('media'));t.oncomplete=()=>resolve(r.result);t.onerror=()=>reject(Error('Device storage is full or unavailable.'));});}
  async list(){return this.persistent?this.run('readonly',s=>s.getAll()):[...this.memory.values()];}
  async put(item){if(this.persistent)await this.run('readwrite',s=>s.put(item));else{const total=[...this.memory.values()].reduce((n,f)=>n+f.blob.size,0);if(total+item.blob.size>128*1024*1024)throw Error('Session library is full (128 MiB). Save/share files and remove items to continue.');this.memory.set(item.key,item);}}
  async remove(key){if(this.persistent)await this.run('readwrite',s=>s.delete(key));else this.memory.delete(key);}
}
