// Netzwerk-Grenzen von FORGE 5, gemessen gegen lokale Lauscher (HTTP + UDP).
// GESCHLOSSEN: Kanäle, die dicht sein müssen. Treffer = Regression = Exit-Code 1.
// OFFEN: bekannte Lücken (siehe README). Sie werden nur gemeldet; schließen sie sich, erscheint ein Hinweis.
import {chromium} from 'playwright';import http from 'node:http';import fs from 'node:fs';import dgram from 'node:dgram';
const hits=[],udp=[];
const app=http.createServer((q,r)=>{r.setHeader('Content-Type','text/html');r.end(fs.readFileSync('dist/FORGE-5.html'))}).listen(0,'127.0.0.1');
const sink=http.createServer((q,r)=>{hits.push(q.method+' '+q.url);r.setHeader('Access-Control-Allow-Origin','*');r.end('')}).listen(0,'127.0.0.1');
const sock=dgram.createSocket('udp4');sock.on('message',(m,i)=>udp.push(m.length+'B'));sock.bind(0,'127.0.0.1');
await Promise.all([new Promise(r=>app.on('listening',r)),new Promise(r=>sink.on('listening',r)),new Promise(r=>sock.on('listening',r))]);
const P=sink.address().port,B='http://127.0.0.1:'+P,U=sock.address().port;
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||undefined,args:['--no-sandbox']});
async function trial(mode,code){hits.length=0;udp.length=0;const p=await browser.newPage();await p.goto('http://127.0.0.1:'+app.address().port);await p.selectOption('#mode',mode);await p.locator('.cm-content').click();await p.keyboard.press('Control+a');await p.keyboard.insertText(code);await p.click('#run');if(mode==='dom')await p.click('#consentYes');await p.waitForTimeout(1500);await p.close();return {hits:[...hits],udp:[...udp]}}
const js=s=>`<script>${s}<\/script>`;
const closed=[
 ['static','Bild',`<img src="${B}/x">`],
 ['static','CSS @import/url()/@font-face',`<style>@import url(${B}/a.css);body{background:url(${B}/b.png)}@font-face{font-family:x;src:url(${B}/f.woff)}</style>`],
 ['static','iframe/object/embed/video/audio',`<iframe src="${B}/f"></iframe><object data="${B}/o"></object><embed src="${B}/e"><video src="${B}/v.mp4" autoplay></video><audio src="${B}/a.mp3" autoplay></audio>`],
 ['static','Meta-Refresh',`<meta http-equiv="refresh" content="0;url=${B}/r">`],
 ['static','link prefetch/preload/modulepreload',`<link rel="prefetch" href="${B}/p1"><link rel="preload" as="image" href="${B}/p2"><link rel="modulepreload" href="${B}/p3.js">`],
 ['static','link preconnect/dns-prefetch',`<link rel="preconnect" href="${B}"><link rel="dns-prefetch" href="${B}">`],
 ['static','speculationrules',`<script type="speculationrules">{"prefetch":[{"source":"list","urls":["${B}/s"]}]}<\/script>`],
 ['dom','Skript von außen',`<script src="${B}/s.js"><\/script>`],
 ['dom','fetch no-cors',js(`fetch('${B}/f',{mode:'no-cors'}).catch(()=>{})`)],
 ['dom','sendBeacon',js(`navigator.sendBeacon('${B}/b','x')`)],
 ['dom','WebSocket',js(`try{new WebSocket('ws://127.0.0.1:${P}/w')}catch(e){}`)],
 ['dom','EventSource',js(`try{new EventSource('${B}/es')}catch(e){}`)],
 ['dom','dynamischer Import',js(`import('${B}/m.js').catch(()=>{})`)],
 ['dom','externer Worker',js(`try{new Worker('${B}/w.js')}catch(e){}`)],
 ['dom','Image-Objekt',js(`new Image().src='${B}/i'`)],
 ['dom','Formular absenden',`<form action="${B}/form" method="post"><input name=a value=1></form>`+js(`document.forms[0].submit()`)],
 ['dom','a[ping] anklicken',`<a id=l href="${B}/a" ping="${B}/ping">x</a>`+js(`document.getElementById('l').click()`)],
 ['dom','location.href',js(`location.href='${B}/nav'`)],
 ['dom','window.open',js(`window.open('${B}/open')`)],
 ['worker','importScripts',`try{importScripts('${B}/is.js')}catch(e){}`],
 ['worker','XMLHttpRequest',`try{const x=new XMLHttpRequest();x.open('GET','${B}/xhr');x.send()}catch(e){}`],
 ['worker','fetch',`fetch('${B}/wf').catch(()=>{})`],
];
const open=[
 ['static','`<link rel="prerender">` (nur HTML)',`<link rel="prerender" href="${B}/prerender">`,'hits'],
 ['dom','`<link rel="prerender">` per JavaScript',js(`const l=document.createElement('link');l.rel='prerender';l.href='${B}/pr?d='+btoa('daten');document.head.append(l)`),'hits'],
 ['dom','WebRTC (STUN über UDP)',js(`(async()=>{const pc=new RTCPeerConnection({iceServers:[{urls:'stun:127.0.0.1:${U}'}]});pc.createDataChannel('x');await pc.setLocalDescription(await pc.createOffer())})().catch(()=>{})`),'udp'],
];
const rows=[];let fail=0;
for(const [mode,name,code] of closed){const r=await trial(mode,code);const leak=r.hits.length+r.udp.length>0;if(leak)fail++;rows.push(`| ${mode} | ${name} | geschlossen erwartet | ${leak?'**LECK: '+[...r.hits,...r.udp].join(', ')+'**':'dicht'} |`)}
for(const [mode,name,code,kind] of open){const r=await trial(mode,code);const leak=r[kind].length>0;rows.push(`| ${mode} | ${name} | bekannte Lücke | ${leak?'offen (wie dokumentiert)':'jetzt GESCHLOSSEN – README anpassen'} |`)}
const out=['## Netzwerk-Grenzen von FORGE 5','','| Modus | Kanal | Erwartung | Ergebnis |','|---|---|---|---|',...rows,'',fail?`**${fail} Kanal/Kanäle sind nicht mehr dicht.**`:'Alle erwarteten Sperren halten.'].join('\n');
console.log(out);if(process.env.GITHUB_STEP_SUMMARY)fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY,out+'\n');
await browser.close();app.close();sink.close();sock.close();process.exit(fail?1:0);
