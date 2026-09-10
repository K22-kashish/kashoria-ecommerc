(function(){
"use strict";
const api=window.KASHORIA_API_CLIENT;
function setSession(data){localStorage.setItem("kashoria_token",data.token);localStorage.setItem("kashoria_current_user",JSON.stringify(data.user));}
async function submit(path,payload){if(!api)return;try{const data=await api.request(path,{method:"POST",body:JSON.stringify(payload)});setSession(data);alert(data.message||"Success ♡");location.href="account.html";}catch(e){alert(e.message);}}
document.getElementById("signup-form")?.addEventListener("submit",e=>{e.preventDefault();submit("/api/auth/register",{name:document.getElementById("signup-name").value.trim(),email:document.getElementById("signup-email").value.trim(),password:document.getElementById("signup-password").value});});
document.getElementById("login-form")?.addEventListener("submit",e=>{e.preventDefault();submit("/api/auth/login",{email:document.getElementById("login-email").value.trim(),password:document.getElementById("login-password").value});});
})();