import {build} from 'esbuild';import fs from 'node:fs';
await build({entryPoints:['app.js'],bundle:true,minify:true,format:'iife',outfile:'bundle.js',legalComments:'inline'});
let app=fs.readFileSync('bundle.js','utf8').replace(/<\/script/gi,'<\\/script');fs.mkdirSync('dist',{recursive:true});fs.writeFileSync('dist/FORGE-5.html',fs.readFileSync('template.html','utf8').replace('/* APP_BUNDLE */',()=>app));

