import { useCallback, useEffect, useState } from 'react';
import { request } from '../utils/api';
export default function useRemoteReport(path) {
 const [revision,setRevision]=useState(0),[state,setState]=useState({data:null,loading:true,error:''});
 const refresh=useCallback(()=>setRevision(v=>v+1),[]);
 useEffect(()=>{
  if(!path){setState({data:null,loading:false,error:''});return;}
  const controller=new AbortController();let live=true;
  setState({data:null,loading:true,error:''});
  request(path,{signal:controller.signal}).then(data=>{if(live)setState({data,loading:false,error:''});}).catch(e=>{if(live)setState({data:null,loading:false,error:e.message});});
  return()=>{live=false;controller.abort();};
 },[path,revision]);
 useEffect(()=>{
  const visible=()=>{if(!document.hidden)refresh();};
  const storage=e=>{if(e.key==='colorlenses-sales-updated')visible();};
  window.addEventListener('colorlensesSalesUpdated',visible);window.addEventListener('storage',storage);document.addEventListener('visibilitychange',visible);
  const timer=setInterval(()=>{if(!document.hidden)refresh();},60000);
  return()=>{clearInterval(timer);window.removeEventListener('colorlensesSalesUpdated',visible);window.removeEventListener('storage',storage);document.removeEventListener('visibilitychange',visible);};
 },[refresh]);
 return {...state,refresh};
}
