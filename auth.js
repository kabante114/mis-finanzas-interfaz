(function(root){
 'use strict';
 const entryParams=new URLSearchParams(root.location.hash.slice(1));
 // Capture invite/recovery intent before the SDK consumes and removes the fragment.
 let client,session,resolveReady,closed=false,authorized=false,recoveryMode=['invite','recovery'].includes(entryParams.get('type'))&&entryParams.has('access_token'),restartRequired=false;
 const ready=new Promise(r=>resolveReady=r);
 const el=id=>document.getElementById(id);
 const status=message=>{el('authStatus').textContent=message;};
 let recoveryBusy=false,recoveryUntil=0,recoveryTimer,pageActive=true;
 const passwordFields=[['authPassword','authPasswordToggle'],['authNewPassword','authNewPasswordToggle']];
 function setPasswordVisible(inputId,buttonId,visible){
  el(inputId).type=visible?'text':'password';
  el(buttonId).setAttribute('aria-pressed',String(visible));
  el(buttonId).setAttribute('aria-label',visible?'Ocultar contraseña':'Mostrar contraseña');
 }
 function hidePasswords(){for(const [input,button] of passwordFields)setPasswordVisible(input,button,false);}
 function clearRecoveryTimer(){clearTimeout(recoveryTimer);recoveryTimer=undefined;}
 function renderRecovery(){
  clearRecoveryTimer();
  const seconds=Math.max(0,Math.ceil((recoveryUntil-Date.now())/1000));
  el('authRecover').disabled=recoveryBusy||seconds>0;
  el('authRecover').textContent=recoveryBusy?'Solicitando recuperación…':seconds?`Volver a intentar en ${seconds} s`:'Recuperar mi contraseña';
  if(seconds&&pageActive&&!closed&&!el('authGate').hidden&&!el('authForm').hidden)recoveryTimer=setTimeout(renderRecovery,1000);
 }
 function recoveryError(error){
  const code=error?.code||'',message=error?.message||'';
  if(code==='over_request_rate_limit'||/security purposes|after \d+|wait|interval|segundos/i.test(message))return 'Debes esperar antes de solicitar otro enlace. Vuelve a intentarlo más tarde.';
  if(error?.status===429||code==='over_email_send_rate_limit')return 'Se ha alcanzado el límite de envíos de recuperación. Vuelve a intentarlo más tarde.';
  if(error?.status>=500)return 'El servidor no pudo tramitar el correo de recuperación. No se ha confirmado el envío; vuelve a intentarlo más tarde.';
  if(error?.name==='AuthRetryableFetchError'||error?.name==='TypeError'||!error?.status)return 'No se pudo conectar con el servicio. No podemos confirmar la solicitud; revisa tu conexión.';
  return 'No se pudo solicitar la recuperación. Vuelve a intentarlo más tarde.';
 }
 const response=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});
 function namespace(){if(!session?.user?.id)throw Error('Inicia sesión primero.');return 'finpage_'+session.user.id+'_';}
 const storage={getItem:k=>localStorage.getItem(namespace()+k),setItem:(k,v)=>localStorage.setItem(namespace()+k,v),removeItem:k=>localStorage.removeItem(namespace()+k)};
 async function accept(s){
  hidePasswords();clearRecoveryTimer();
  session=s;authorized=false;
  if(recoveryMode&&s){el('authGate').hidden=false;el('authForm').hidden=true;el('authRecovery').hidden=false;status('Establece tu contraseña personal. No la compartas.');return;}
  if(!s){el('authGate').hidden=false;el('authForm').hidden=false;el('authRecovery').hidden=true;renderRecovery();el('financeApp').hidden=true;el('syncBar').hidden=true;status('Introduce tu correo y contraseña para acceder.');return;}
  // Check owner authorization and backend readiness BEFORE revealing the app or reading cache.
  const {error}=await client.rpc('finance_read_state');
  if(error){status('La cuenta no está autorizada o falta configurar la base de datos. No se han cargado movimientos.');return;}
  if(restartRequired){root.location.reload();return;}
  authorized=true;el('authGate').hidden=true;el('syncBar').hidden=false;resolveReady();
 }
 async function transport(url,options={}){
  if(closed||!authorized||!session||url!=='/api/state')return response({error:'No autorizado'},401);
  try{
   let result;
   if((options.method||'GET')==='GET')result=await client.rpc('finance_read_state');
   else if(options.method==='PUT'){
    const body=JSON.parse(options.body);
    result=await client.rpc('finance_write_state',{base_revision:body.baseRevision,new_state:body.state});
   }else return response({error:'Método no permitido'},405);
   if(result.error)return response({error:result.error.code==='40001'?'Hay cambios más recientes en otro dispositivo.':'No se pudo guardar o leer el estado privado.'},result.error.code==='40001'?409:result.error.code==='42501'?403:400);
   return response(result.data);
  }catch{return response({error:'No se pudo conectar. Conserva tus cambios locales.'},503);}
 }
 async function logout(){
  hidePasswords();clearRecoveryTimer();
  closed=true;root.financeSync?.stop();
  if(session?.user?.id){const prefix=namespace();for(const k of Object.keys(localStorage))if(k.startsWith(prefix))localStorage.removeItem(k);}
  el('financeApp').hidden=true;el('syncBar').hidden=true;
  if(client)await client.auth.signOut({scope:'local'});
  root.location.reload();
 }
 async function boot(){
  hidePasswords();
  for(const [input,button] of passwordFields)el(button).addEventListener('click',()=>setPasswordVisible(input,button,el(input).type==='password'));
  root.addEventListener('pagehide',()=>{pageActive=false;hidePasswords();clearRecoveryTimer();});
  root.addEventListener('pageshow',()=>{pageActive=true;if(client)renderRecovery();});
  // Also cover form visibility changes made by the surrounding UI.
  const observer=new MutationObserver(()=>{
   if(el('authGate').hidden||el('authForm').hidden||el('authRecovery').hidden)hidePasswords();
   renderRecovery();
  });
  for(const id of ['authGate','authForm','authRecovery'])observer.observe(el(id),{attributes:true,attributeFilter:['hidden']});
  const config=root.FINANCE_CONFIG||{};
  if(!/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(config.supabaseUrl)||!/^sb_publishable_[a-zA-Z0-9_-]+$/.test(config.publishableKey)){
   status('Configuración pendiente: la interfaz está publicada, pero el acceso privado todavía no está activado. Tus datos no están en esta web.');
   el('authSubmit').disabled=true;el('authRecover').disabled=true;return;
  }
  if(!root.FinanceSupabase?.createClient){status('No se pudo cargar el servicio de acceso. Recarga la página.');return;}
  client=root.FinanceSupabase.createClient(config.supabaseUrl,config.publishableKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true,storageKey:'finpage-auth-v1'}});
  client.auth.onAuthStateChange((event,s)=>{
   hidePasswords();
   if(event==='SIGNED_OUT'){restartRequired=authorized;session=null;authorized=false;recoveryMode=false;root.financeSync?.stop();el('financeApp').hidden=true;el('syncBar').hidden=true;el('authGate').hidden=false;el('authForm').hidden=false;el('authRecovery').hidden=true;renderRecovery();}
   if(event==='TOKEN_REFRESHED')session=s;
   if(event==='PASSWORD_RECOVERY'){recoveryMode=true;clearRecoveryTimer();el('authGate').hidden=false;el('authRecovery').hidden=false;el('authForm').hidden=true;}
  });
  el('authForm').addEventListener('submit',async e=>{
   e.preventDefault();hidePasswords();el('authSubmit').disabled=true;status('Comprobando acceso…');
   const credentials={email:el('authEmail').value.trim(),password:el('authPassword').value};
   try{const {data,error}=await client.auth.signInWithPassword(credentials);el('authPassword').value='';if(error)status('No se ha podido iniciar sesión. Comprueba tus credenciales.');else await accept(data.session);}
   catch{status('No se ha podido contactar con el servicio.');}
   finally{credentials.password='';el('authPassword').value='';hidePasswords();el('authSubmit').disabled=false;}
  });
  el('authRecover').onclick=async()=>{
   if(recoveryBusy||Date.now()<recoveryUntil||closed)return;
   const email=el('authEmail').value.trim();if(!email){status('Escribe tu correo para recuperar el acceso.');return;}
   recoveryBusy=true;renderRecovery();
   try{
    const {error}=await client.auth.resetPasswordForEmail(email,{redirectTo:new URL('./',root.location.href).href});
    if(error)status(recoveryError(error));
    else status('Si la cuenta está habilitada, recibirás las instrucciones de recuperación.');
   }catch(error){status(recoveryError(error));}
   finally{recoveryBusy=false;recoveryUntil=Date.now()+60000;renderRecovery();}
  };
  el('authRecovery').onsubmit=async e=>{
   e.preventDefault();hidePasswords();const input=el('authNewPassword');
   if(input.value.length<12){status('Usa una contraseña de al menos 12 caracteres.');return;}
   try{
    const {error}=await client.auth.updateUser({password:input.value});input.value='';
    if(error)status('No se pudo cambiar la contraseña. Solicita otro enlace.');else root.location.replace(new URL('./',root.location.href));
   }catch{status('No se pudo contactar con el servicio para cambiar la contraseña.');}
   finally{hidePasswords();}
  };
  const {data,error}=await client.auth.getSession();
  if(error)status('La sesión no es válida. Inicia sesión de nuevo.');
  else await accept(data.session);
 }
 root.FinanceAuth={ready,transport,storage,logout,isReady:()=>authorized};
 document.addEventListener('DOMContentLoaded',()=>boot().catch(()=>status('No se pudo iniciar el acceso privado. No se han cargado datos.')));
})(window);
