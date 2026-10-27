'use strict';
const fs=require('node:fs'),path=require('node:path'),{execFileSync}=require('node:child_process');
const root=__dirname;
const shared=fs.existsSync(path.join(root,'../component/swarm-core.js'))?path.resolve(root,'../component'):path.resolve(root,'..');
function copyTree(src,dest,rename=false){
  fs.mkdirSync(dest,{recursive:true});
  for(const entry of fs.readdirSync(src,{withFileTypes:true})){
    const target=path.join(dest,rename&&entry.name==='electron.exe'?'Bat Swarm.exe':entry.name);
    if(entry.isDirectory())copyTree(path.join(src,entry.name),target);
    else fs.copyFileSync(path.join(src,entry.name),target);
  }
}
fs.mkdirSync(path.join(root,'component'),{recursive:true});
for(const f of ['swarm-core.js','sound.js'])fs.copyFileSync(path.join(shared,f),path.join(root,'component',f));
execFileSync('C:/Windows/Microsoft.NET/Framework64/v4.0.30319/csc.exe',['/nologo','/target:exe','/out:'+path.join(root,'WindowProbe.exe'),path.join(root,'WindowProbe.cs')],{windowsHide:true,stdio:'inherit'});
if(process.argv.includes('--package')){
  const dest=path.join(root,'../release/Bat-Swarm-Windows');fs.mkdirSync(dest,{recursive:true});
  const electron=path.join(root,'node_modules/electron/dist');
  copyTree(electron,dest,true);
  const appDir=path.join(dest,'resources/app');fs.mkdirSync(appDir,{recursive:true});
  for(const f of ['package.json','main.cjs','preload.cjs','geometry.cjs','overlay.html','overlay.js','icon.png','WindowProbe.exe'])fs.copyFileSync(path.join(root,f),path.join(appDir,f));
  fs.copyFileSync(path.join(shared,'LICENSE'),path.join(appDir,'LICENSE'));
  copyTree(path.join(root,'component'),path.join(appDir,'component'));
  fs.copyFileSync(path.join(root,'README.md'),path.join(dest,'READ-ME.txt'));
  fs.writeFileSync(path.join(dest,'Start Bat Swarm.cmd'),'@echo off\r\nstart "" "%~dp0Bat Swarm.exe"\r\n');
  console.log('Packaged '+dest);
}
