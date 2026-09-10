(function(){
  'use strict';
  const API = String(window.KASHORIA_API || '').replace(/\/+$/, '');
  function token(){ return localStorage.getItem('kashoria_token') || ''; }
  async function request(path, options={}){
    const headers = new Headers(options.headers||{});
    if(options.body && !(options.body instanceof FormData) && !headers.has('Content-Type')) headers.set('Content-Type','application/json');
    const t=token(); if(t) headers.set('Authorization','Bearer '+t);
    const res=await fetch(API+path,{...options,headers});
    let data={}; try{data=await res.json();}catch(_){data={};}
    if(!res.ok){const e=new Error(data.message||`Request failed (${res.status})`);e.status=res.status;throw e;}
    return data;
  }
  window.KASHORIA_API_CLIENT={request,token};
})();
