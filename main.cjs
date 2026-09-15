const {app, BrowserWindow} = require('electron');
const {spawn} = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
let service;
function getResource(name){return app.isPackaged?path.join(process.resourcesPath,name):path.join(__dirname,name)}
function waitForService(){return new Promise((resolve,reject)=>{const started=Date.now();const check=()=>{const req=http.get('http://127.0.0.1:8002/status',res=>{res.resume();if(res.statusCode===200)return resolve();setTimeout(check,300)});req.on('error',()=>{if(Date.now()-started>60000)reject(new Error('本地路由服务启动超时'));else setTimeout(check,300)});req.setTimeout(1000,()=>req.destroy())};check()})}
async function startService(){const root=path.join(app.getPath('userData'),'valhalla');const tiles=path.join(root,'valhalla_tiles');if(!fs.existsSync(tiles)){fs.mkdirSync(root,{recursive:true});const tar=getResource('data/valhalla_tiles.tar');require('child_process').execFileSync('tar',['-xf',tar,'-C',root]);}const config=path.join(root,'valhalla.json');let text=fs.readFileSync(getResource('data/valhalla.json'),'utf8').replaceAll('__TILE_DIR__',tiles);fs.writeFileSync(config,text);const bin=getResource('bin/valhalla_service');service=spawn(bin,[config,'1'],{stdio:'ignore'});service.on('error',e=>console.error(e));await waitForService()}
async function createWindow(){await startService();const win=new BrowserWindow({width:1440,height:960,minWidth:980,minHeight:700,webPreferences:{contextIsolation:true,sandbox:true}});await win.loadFile(path.join(__dirname,'renderer.html'));}
app.whenReady().then(createWindow).catch(err=>{console.error(err);app.quit()});app.on('window-all-closed',()=>{if(service)service.kill();if(process.platform!=='darwin')app.quit()});app.on('before-quit',()=>{if(service)service.kill()});
