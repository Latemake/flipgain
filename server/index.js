import http from 'node:http';
import { Readable } from 'node:stream';
import { readFile } from 'node:fs/promises';
import { resolve,relative,extname,sep } from 'node:path';
import { handleRequest } from './handler.js';

const root=resolve('dist');
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png','.svg':'image/svg+xml','.ico':'image/x-icon'};
const server=http.createServer(async(req,res)=>{
  try {
    const url=new URL(req.url,'http://localhost');
    if(url.pathname.startsWith('/api/')) {
      const request=new Request(url,{method:req.method,headers:req.headers,...(['GET','HEAD'].includes(req.method)?{}:{body:Readable.toWeb(req),duplex:'half'})});
      const response=await handleRequest(request);res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));return;
    }
    if(!['GET','HEAD'].includes(req.method)){res.writeHead(405);res.end();return;}
    const path=resolve(root,'.'+decodeURIComponent(url.pathname==='/'?'/index.html':url.pathname));
    const rel=relative(root,path);if(rel==='..'||rel.startsWith('..'+sep)||!rel){res.writeHead(404);res.end();return;}
    const body=await readFile(path);res.writeHead(200,{'Content-Type':mime[extname(path)]||'application/octet-stream','X-Content-Type-Options':'nosniff'});res.end(req.method==='HEAD'?undefined:body);
  }catch{res.writeHead(404);res.end('Not found');}
});
server.requestTimeout=160000;
server.listen(Number(process.env.PORT||8787),process.env.HOST||'127.0.0.1',()=>console.log('Flipgain server listening on port '+(process.env.PORT||8787)));
