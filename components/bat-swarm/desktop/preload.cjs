const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('desktopBats',{
  onFrame:fn=>{const cb=(_e,data)=>fn(data);ipcRenderer.on('geometry',cb);return ()=>ipcRenderer.removeListener('geometry',cb);},
  onConfig:fn=>{const cb=(_e,data)=>fn(data);ipcRenderer.on('config',cb);return ()=>ipcRenderer.removeListener('config',cb);}
});
