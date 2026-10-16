import {allowedHost} from './core.js';
/** Adapt documented SDK 1.8 net.fetch responses to the standard fetch interface. */
export function createTransport({sdk=globalThis.Batiyao,fallback=globalThis.fetch,onProgress=()=>{}}={}){
 return async(url,options={})=>{
  const address=String(url);if(!allowedHost(address))throw Error('Blocked unexpected network host.');
  options.signal?.throwIfAborted();
  let native=false;try{native=!!sdk&&await sdk.supports('net');}catch{}
  options.signal?.throwIfAborted();
  if(!native)return fallback(url,options);
  const responseType=new URL(address).hostname.endsWith('.googlevideo.com')?'blob':'text';
  const promise=sdk.net.fetch(address,{method:options.method||'GET',headers:options.headers,body:options.body,response:responseType,onProgress:p=>onProgress({loaded:p.received,total:p.total||0})});
  const cancel=()=>{sdk.net.cancel(promise.requestId).catch(()=>{});};
  options.signal?.addEventListener('abort',cancel,{once:true});
  try{
   const result=await promise;options.signal?.throwIfAborted();
   if(!allowedHost(result.url||address))throw Error('Native transport returned an unapproved host.');
   const response=new Response(result.status===204||result.status===304?null:responseType==='blob'?result.blob:result.text,{status:result.status,statusText:result.status_text||'',headers:result.headers});
   Object.defineProperty(response,'url',{value:result.url||address});return response;
  }catch(e){if(e.code==='NET_CANCELLED')throw new DOMException('Download stopped','AbortError');throw e;}
  finally{options.signal?.removeEventListener('abort',cancel);}
 };
}
