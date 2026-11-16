import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
function loadEnv(){
  const file=path.join(__dirname,'.env');
  if(!fs.existsSync(file)) return;
  for(const line of fs.readFileSync(file,'utf8').split(/\r?\n/)){
    const m=line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if(m&&!Object.hasOwn(process.env,m[1])) process.env[m[1]]=m[2].replace(/^(['"])(.*)\1$/,'$2');
  }
}
loadEnv();
const port=Number(process.env.PORT||3000);
const appRoot=path.resolve(__dirname,'public');
const dataDir=path.join(__dirname,'data');
const dbFile=path.join(dataDir,'orders.json');
fs.mkdirSync(dataDir,{recursive:true});
let orders=[];
try{const parsed=JSON.parse(fs.readFileSync(dbFile,'utf8'));if(Array.isArray(parsed))orders=parsed;}catch{}
function saveOrders(){const tmp=dbFile+'.tmp';fs.writeFileSync(tmp,JSON.stringify(orders,null,2));fs.renameSync(tmp,dbFile);}
const products = [
 {id:'sky-shard',server:'MineStar SkyPvP',name:'Odłamek',description:'Stawka za 1 PLN',unit:'PLN',price:1,rate:'3,3 szt. / 1 PLN',min:1,kind:'rate',output:3.3},
 {id:'sky-castle',server:'MineStar SkyPvP',name:'Zamek',description:'Cena za sztukę',unit:'szt.',price:120,rate:'120 PLN / szt.',min:1,kind:'fixed'},
 {id:'sky-ice',server:'MineStar SkyPvP',name:'Lód',description:'Cena za sztukę',unit:'szt.',price:90,rate:'90 PLN / szt.',min:1,kind:'fixed'},
 {id:'sky-club',server:'MineStar SkyPvP',name:'Pałka',description:'Cena za sztukę',unit:'szt.',price:80,rate:'80 PLN / szt.',min:1,kind:'fixed'},
 {id:'sky-lantern',server:'MineStar SkyPvP',name:'Lampion',description:'Cena za sztukę',unit:'szt.',price:45,rate:'45 PLN / szt.',min:1,kind:'fixed'},
 {id:'sky-bell',server:'MineStar SkyPvP',name:'Dzwonek',description:'Cena za sztukę',unit:'szt.',price:60,rate:'60 PLN / szt.',min:1,kind:'fixed'},
 {id:'sky-cash',server:'MineStar SkyPvP',name:'Waluta w grze',description:'220 000 za 1 PLN',unit:'PLN',price:1,rate:'220 000 / 1 PLN',min:1,kind:'currency',output:220000},
 {id:'lf-cash',server:'MineStar LifeSteal',name:'Waluta w grze',description:'3 500 za 1 PLN',unit:'PLN',price:1,rate:'3 500 / 1 PLN',min:1,kind:'currency',output:3500},
 {id:'anarchy-lf',server:'Anarchia.gg LifeSteal',name:'Waluta w grze',description:'10 500$ za 1 PLN',unit:'PLN',price:1,rate:'10 500$ / 1 PLN',min:10,kind:'currency',output:10500},
 {id:'anarchy-box',server:'Anarchia.gg BoxPVP',name:'Waluta w grze',description:'6 500 za 1 PLN',unit:'PLN',price:1,rate:'6 500 / 1 PLN',min:10,kind:'currency',output:6500},
 {id:'donut',server:'DonutSMP',name:'Waluta w grze',description:'2 000 000 za 1 PLN',unit:'PLN',price:1,rate:'2 000 000 / 1 PLN',min:1,kind:'currency',output:2000000}
];
const now=()=>new Date().toISOString();
const makeId=()=>'VX-'+crypto.randomBytes(4).toString('hex').toUpperCase();
const money=n=>Math.round((n+Number.EPSILON)*100)/100;
const wallet=(process.env.LTC_WALLET_ADDRESS||'').trim();
const rateHits=new Map();
function send(res,status,data,headers={}){const body=JSON.stringify(data);res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store',...headers});res.end(body);}
function adminOk(req){const supplied=String(req.headers['x-admin-password']||''),expected=String(process.env.ADMIN_PASSWORD||'');if(!expected||expected.length<16)return 'Najpierw ustaw silne ADMIN_PASSWORD w pliku .env (minimum 16 znaków).';const a=Buffer.from(supplied),b=Buffer.from(expected);return a.length===b.length&&crypto.timingSafeEqual(a,b)?'':'Nieprawidłowe hasło administratora.';}
async function bodyJson(req){let raw='';for await(const chunk of req){raw+=chunk;if(raw.length>32768)throw new Error('Treść żądania jest za duża.');}try{return raw?JSON.parse(raw):{};}catch{return null;}}
async function getLtcRate(){const r=await fetch('https://api.coingecko.com/api/v3/simple/price?ids=litecoin&vs_currencies=pln',{headers:{accept:'application/json'},signal:AbortSignal.timeout(8000)});if(!r.ok)throw new Error('Kurs LTC jest chwilowo niedostępny. Spróbuj ponownie.');const d=await r.json(),rate=Number(d?.litecoin?.pln);if(!Number.isFinite(rate)||rate<=0)throw new Error('Nie udało się pobrać poprawnego kursu LTC.');return rate;}
async function handle(req,res){
 const url=new URL(req.url,'http://localhost');
 // Basic security headers without third-party packages.
 res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('X-Frame-Options','DENY');res.setHeader('Referrer-Policy','no-referrer');
 if(url.pathname.startsWith('/api/')){const ip=req.socket.remoteAddress||'unknown',t=Date.now(),hits=(rateHits.get(ip)||[]).filter(x=>t-x<60000);if(hits.length>=90)return send(res,429,{error:'Za dużo żądań. Spróbuj za chwilę.'});hits.push(t);rateHits.set(ip,hits);}
 if(req.method==='GET'&&url.pathname==='/api/config')return send(res,200,{discordUrl:process.env.DISCORD_URL||'https://discord.gg/zb4YhgEpt',tipplyUrl:process.env.TIPPLY_URL||'https://tipply.pl/@kubsoon23',ltcEnabled:Boolean(wallet),walletAddress:wallet,products});
 if(req.method==='GET'&&url.pathname==='/health')return send(res,200,{ok:true,service:'VexlyShop',ltcEnabled:Boolean(wallet)});
 if(req.method==='POST'&&url.pathname==='/api/orders'){
  try{const b=await bodyJson(req);if(!b)return send(res,400,{error:'Nieprawidłowe dane formularza.'});const {nick,productId,quantity,paymentMethod}=b;const p=products.find(x=>x.id===productId),q=Number(quantity);if(!p||typeof nick!=='string'||nick.trim().length<2||nick.trim().length>16||!/^[A-Za-z0-9_]+$/.test(nick.trim()))return send(res,400,{error:'Wpisz poprawny nick Minecraft (2–16 znaków, litery, cyfry i _).'});if(!Number.isFinite(q)||q<(p.min||1)||q>100000)return send(res,400,{error:`Minimalna wartość dla tego produktu to ${p.min||1}.`});if(p.kind!=='fixed'&&!Number.isInteger(q))return send(res,400,{error:'Kwotę PLN wpisz jako pełną liczbę.'});if(!['LTC','MANUAL'].includes(paymentMethod))return send(res,400,{error:'Nieprawidłowa metoda płatności.'});if(paymentMethod==='LTC'&&!wallet)return send(res,503,{error:'Płatność LTC nie jest skonfigurowana. Ustaw adres w .env.'});const total=money(p.kind==='fixed'?q*p.price:q);if(total<1||total>100000)return send(res,400,{error:'Kwota zamówienia musi wynosić od 1 do 100 000 PLN.'});let rate=null,ltcAmount=null;if(paymentMethod==='LTC'){rate=await getLtcRate();ltcAmount=(total/rate).toFixed(8);}const id=makeId(),created=now();const order={id,created_at:created,updated_at:created,customer_nick:nick.trim(),server:p.server,product_id:p.id,product_name:p.name,quantity:q,unit_price:p.price,total_pln:total,payment_method:paymentMethod,payment_status:'OCZEKUJE',fulfillment_status:'OCZEKUJE_NA_PLATNOSC',txid:null,ltc_amount:ltcAmount,ltc_rate:rate,seller_note:null,fulfilled_at:null};orders.unshift(order);saveOrders();return send(res,201,{orderId:id,total,paymentMethod,walletAddress:paymentMethod==='LTC'?wallet:null,ltcAmount,ltcRate:rate});}catch(e){console.error(e);return send(res,502,{error:e.message||'Nie udało się utworzyć zamówienia.'});}}
 const txMatch=url.pathname.match(/^\/api\/order\/([^/]+)\/txid$/);if(req.method==='POST'&&txMatch){const b=await bodyJson(req);if(!b)return send(res,400,{error:'Nieprawidłowe dane.'});const txid=String(b.txid||'').trim();if(!/^[a-fA-F0-9]{64}$/.test(txid))return send(res,400,{error:'TXID musi mieć dokładnie 64 znaki szesnastkowe.'});const o=orders.find(x=>x.id===decodeURIComponent(txMatch[1]));if(!o)return send(res,404,{error:'Nie znaleziono zamówienia.'});if(o.payment_method!=='LTC')return send(res,409,{error:'To zamówienie nie jest opłacane LTC.'});o.txid=txid;o.updated_at=now();saveOrders();return send(res,200,{ok:true,message:'TXID zapisany. Płatność oczekuje na sprawdzenie.'});}
 const orderMatch=url.pathname.match(/^\/api\/order\/([^/]+)$/);if(req.method==='GET'&&orderMatch){const o=orders.find(x=>x.id===decodeURIComponent(orderMatch[1]));if(!o)return send(res,404,{error:'Nie znaleziono zamówienia.'});const {id,created_at,customer_nick,server,product_name,quantity,total_pln,payment_method,payment_status,fulfillment_status,txid,ltc_amount}=o;return send(res,200,{id,created_at,customer_nick,server,product_name,quantity,total_pln,payment_method,payment_status,fulfillment_status,txid,ltc_amount});}
 if(url.pathname==='/api/admin/orders'&&req.method==='GET'){const err=adminOk(req);if(err)return send(res,err.startsWith('Najpierw')?503:401,{error:err});return send(res,200,{orders:orders.slice(0,500)});}
 const paidMatch=url.pathname.match(/^\/api\/admin\/orders\/([^/]+)\/paid$/);if(req.method==='POST'&&paidMatch){const err=adminOk(req);if(err)return send(res,err.startsWith('Najpierw')?503:401,{error:err});const o=orders.find(x=>x.id===decodeURIComponent(paidMatch[1]));if(!o)return send(res,404,{error:'Nie znaleziono zamówienia.'});o.payment_status='OPŁACONE';o.fulfillment_status='GOTOWE_DO_REALIZACJI';o.updated_at=now();saveOrders();return send(res,200,{ok:true});}
 const doneMatch=url.pathname.match(/^\/api\/admin\/orders\/([^/]+)\/fulfill$/);if(req.method==='POST'&&doneMatch){const err=adminOk(req);if(err)return send(res,err.startsWith('Najpierw')?503:401,{error:err});const o=orders.find(x=>x.id===decodeURIComponent(doneMatch[1]));if(!o)return send(res,404,{error:'Nie znaleziono zamówienia.'});if(o.payment_status!=='OPŁACONE')return send(res,409,{error:'Najpierw potwierdź płatność.'});const b=await bodyJson(req)||{};o.fulfillment_status='ZREALIZOWANE';o.seller_note=String(b.note||'').slice(0,500);o.fulfilled_at=now();o.updated_at=now();saveOrders();return send(res,200,{ok:true});}
 if(req.method==='GET'){
  let pathname;try{pathname=decodeURIComponent(url.pathname);}catch{return send(res,400,{error:'Nieprawidłowy adres.'});}
  const relative=pathname==='/'?'index.html':pathname.replace(/^\/+/,''),file=path.resolve(appRoot,relative);if(file!==appRoot&&!file.startsWith(appRoot+path.sep))return send(res,403,{error:'Brak dostępu.'});
  try{const stat=fs.statSync(file);if(!stat.isFile())throw new Error();const ext=path.extname(file).toLowerCase(),types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml','.ico':'image/x-icon'};res.writeHead(200,{'Content-Type':types[ext]||'application/octet-stream'});fs.createReadStream(file).pipe(res);return;}catch{return send(res,404,{error:'Nie znaleziono strony.'});}
 }
 return send(res,404,{error:'Nie znaleziono endpointu.'});
}
const server=http.createServer((req,res)=>{handle(req,res).catch(e=>{console.error(e);if(!res.headersSent)send(res,500,{error:'Wystąpił błąd serwera.'});else res.end();});});
server.listen(port,()=>console.log(`VexlyShop działa: http://localhost:${port}`));
