'use strict';
const {app,BrowserWindow,Tray,Menu,nativeImage,screen,powerMonitor}=require('electron');
const {spawn}=require('node:child_process');const path=require('node:path');const readline=require('node:readline');
const {edges,isFullscreen}=require('./geometry.cjs');
const test=process.argv.includes('--self-test');
app.setName('Bat Swarm');
const profile=process.argv.includes('--qa')||test?path.join(__dirname,'../checks/electron-profile'):path.join(app.getPath('appData'),'ShipNotesBatSwarm');
require('node:fs').mkdirSync(profile,{recursive:true});app.setPath('userData',profile);
let overlays=[],tray,probe,watchdog,enabled=true,locked=false,config={count:28,sound:false},lastPacket=0,lastData;
let qaCounter=0;
let quitting=false;
if(!app.requestSingleInstanceLock()){app.quit();}else{
app.whenReady().then(()=>{
  if(process.platform!=='win32'){app.quit();return;}
  const icon=nativeImage.createFromPath(path.join(__dirname,'icon.png'));
  tray=new Tray(icon);tray.setToolTip('Bat Swarm · Ship Notes');menu();
  function rebuild(){for(const w of overlays)w.close();overlays=[];
    for(const display of screen.getAllDisplays()){
      const win=new BrowserWindow({...display.bounds,transparent:true,frame:false,resizable:false,hasShadow:false,focusable:false,skipTaskbar:true,alwaysOnTop:true,show:false,backgroundColor:'#00000000',webPreferences:{preload:path.join(__dirname,'preload.cjs'),contextIsolation:true,nodeIntegration:false,sandbox:true,backgroundThrottling:true,autoplayPolicy:'no-user-gesture-required'}});
      win.setIgnoreMouseEvents(true,{forward:true});win.setAlwaysOnTop(true,'screen-saver');
      win.webContents.setWindowOpenHandler(()=>({action:'deny'}));win.webContents.on('will-navigate',e=>e.preventDefault());
      win.webContents.on('did-finish-load',()=>{win.webContents.send('config',{...config,paused:!enabled||locked});if(lastData)packet(lastData);});
      win.loadFile(path.join(__dirname,'overlay.html'));win.display=display;overlays.push(win);
    }
  }
  function packet(data){if(quitting)return;lastPacket=Date.now();lastData=data;
    for(const win of overlays){
      const display=win.display,b=display.bounds,physical=screen.dipToScreenRect(win,b);
      const hidden=!enabled||locked||isFullscreen(data.foreground,physical);
      if(hidden){if(win.isVisible())win.hide();win.webContents.send('config',{...config,paused:true});continue;}
      const perches=edges(data.windows,physical).map(p=>{
        const a=screen.screenToDipPoint({x:Math.round(p.x),y:Math.round(p.y)}),z=screen.screenToDipPoint({x:Math.round(p.x+p.w),y:Math.round(p.y)});
        return {...p,x:a.x-b.x,y:a.y-b.y,w:z.x-a.x,h:p.h/display.scaleFactor};
      });
      const cursor=screen.screenToDipPoint({x:data.cursor[0],y:data.cursor[1]});
      if(!win.isVisible())win.showInactive();
      win.moveTop();
      const localCursor=cursor.x>=b.x&&cursor.x<=b.x+b.width&&cursor.y>=b.y&&cursor.y<=b.y+b.height?{x:cursor.x-b.x,y:cursor.y-b.y}:null;
      win.webContents.send('geometry',{perches,cursor:localCursor});
      if(process.argv.includes('--qa')&&qaCounter++%10===0){
        win.webContents.executeJavaScript('({modes:swarm.bats.reduce((o,b)=>(o[b.mode]=(o[b.mode]||0)+1,o),{}),time:swarm.t,lastMove:swarm.lastMove})').then(state=>{
          require('node:fs').appendFileSync(path.join(__dirname,'../checks/qa-native.jsonl'),JSON.stringify({t:Date.now(),physical,perches,windows:data.windows,state,metrics:app.getAppMetrics()})+'\n');
        }).catch(()=>{});
      }
    }
  }
  rebuild();screen.on('display-added',rebuild);screen.on('display-removed',rebuild);screen.on('display-metrics-changed',rebuild);
  powerMonitor.on('lock-screen',()=>{locked=true;for(const w of overlays)w.hide();});powerMonitor.on('unlock-screen',()=>{locked=false;});
  powerMonitor.on('suspend',()=>{locked=true;for(const w of overlays)w.hide();});powerMonitor.on('resume',()=>{locked=false;});
  probe=spawn(path.join(__dirname,'WindowProbe.exe'),[String(process.pid)],{windowsHide:true,stdio:['ignore','pipe','pipe']});
  const lines=readline.createInterface({input:probe.stdout});lines.on('line',line=>{try{const d=JSON.parse(line);if(Array.isArray(d.windows)&&d.cursor)packet(d);}catch{}});
  probe.on('error',()=>{tray.setToolTip('Bat Swarm: window helper unavailable');for(const w of overlays)w.hide();});
  probe.on('exit',()=>{for(const w of overlays)w.hide();tray.setToolTip('Bat Swarm: window helper stopped. Restart the app.');});
  watchdog=setInterval(()=>{if(Date.now()-lastPacket>2000)for(const w of overlays)w.hide();},1000);
  if(test)setTimeout(async()=>{
    const fs=require('node:fs');const result={version:process.versions.electron,displays:screen.getAllDisplays().map(d=>({bounds:d.bounds,scaleFactor:d.scaleFactor})),packets:!!lastData,windows:lastData?.windows.length,metrics:app.getAppMetrics().map(m=>({type:m.type,cpu:m.cpu,memory:m.memory})),overlays:[]};
    for(const w of overlays){result.overlays.push(await w.webContents.executeJavaScript('({core:typeof BatSwarmCore!=="undefined",coreVersion:BatSwarmCore.version,node:typeof require,canvas:document.querySelector("canvas").width,modes:swarm.bats.reduce((o,b)=>(o[b.mode]=(o[b.mode]||0)+1,o),{})})'));}
    fs.writeFileSync(path.join(__dirname,'self-test.json'),JSON.stringify(result,null,2));app.quit();
  },7000);
});
function menu(){
  const update=()=>{for(const w of overlays)w.webContents.send('config',{...config,paused:!enabled||locked});menu();};
  tray.setContextMenu(Menu.buildFromTemplate([
    {label:'Bats on the desktop',type:'checkbox',checked:enabled,click:()=>{enabled=!enabled;if(!enabled)for(const w of overlays)w.hide();update();}},
    {label:'Colony size',submenu:[18,28,38,60].map(n=>({label:String(n)+' bats',type:'radio',checked:config.count===n,click:()=>{config.count=n;update();}}))},
    {label:'Wing sounds',type:'checkbox',checked:config.sound,click:()=>{config.sound=!config.sound;update();}},
    {type:'separator'},{label:'Quit Bat Swarm',click:()=>app.quit()}
  ]));
}
app.on('window-all-closed',()=>{});
app.on('before-quit',()=>{
  quitting=true;clearInterval(watchdog);
  if(probe){probe.removeAllListeners('exit');probe.kill();}
  for(const w of overlays)if(!w.isDestroyed())w.destroy();overlays=[];
  if(tray&&!tray.isDestroyed())tray.destroy();
});
}
