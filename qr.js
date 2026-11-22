/* Générateur de QR code minimal (mode octets, correction d'erreur M, versions 1 à 10) – STADES 3M.
   QR.matrix("texte") -> tableau de tableaux de booléens ; QR.svg("texte", pixels) -> chaîne SVG. */
const QR=(()=>{
const ECC=[0,10,16,26,18,24,16,18,22,22,26],NB=[0,1,1,1,2,2,4,4,4,5,5];
const rawMods=v=>{let r=(16*v+128)*v+64;if(v>=2){const n=Math.floor(v/7)+2;r-=(25*n-10)*n-55;if(v>=7)r-=36}return r};
const nData=v=>Math.floor(rawMods(v)/8)-ECC[v]*NB[v];
const alignPos=v=>{if(v===1)return[];const n=Math.floor(v/7)+2,s=v*4+17,st=Math.ceil((v*4+4)/(n*2-2))*2,r=[6];for(let p=s-7;r.length<n;p-=st)r.splice(1,0,p);return r};
// corps de Galois GF(256) / Reed-Solomon
const EXP=[],LOG=[];{let x=1;for(let i=0;i<255;i++){EXP[i]=x;LOG[x]=i;x<<=1;if(x&256)x^=0x11d}for(let i=255;i<512;i++)EXP[i]=EXP[i-255]}
const gmul=(a,b)=>a&&b?EXP[LOG[a]+LOG[b]]:0;
const rsDiv=n=>{let g=[1];for(let i=0;i<n;i++){const ng=new Array(g.length+1).fill(0);for(let j=0;j<g.length;j++){ng[j]^=g[j];ng[j+1]^=gmul(g[j],EXP[i])}g=ng}return g};
const rsRem=(data,n)=>{const g=rsDiv(n),r=new Array(n).fill(0);for(const b of data){const f=b^r.shift();r.push(0);for(let i=0;i<n;i++)r[i]^=gmul(g[i+1],f)}return r};
function codewords(bytes,v){const cap=nData(v),bits=[];const put=(val,len)=>{for(let i=len-1;i>=0;i--)bits.push((val>>>i)&1)};
 put(4,4);put(bytes.length,v<10?8:16);bytes.forEach(b=>put(b,8));
 put(0,Math.min(4,cap*8-bits.length));while(bits.length%8)bits.push(0);
 const d=[];for(let i=0;i<bits.length;i+=8){let x=0;for(let j=0;j<8;j++)x=x*2+bits[i+j];d.push(x)}
 for(let p=0xec;d.length<cap;p^=0xec^0x11)d.push(p);
 const nb=NB[v],ec=ECC[v],raw=Math.floor(rawMods(v)/8),ns=nb-raw%nb,sl=Math.floor(raw/nb),blocks=[];
 for(let i=0,k=0;i<nb;i++){const len=sl-ec+(i<ns?0:1),dat=d.slice(k,k+len);k+=len;blocks.push({dat,ec:rsRem(dat,ec)})}
 const out=[];for(let i=0;i<sl-ec+1;i++)blocks.forEach((b,j)=>{if(i<b.dat.length&&!(i===sl-ec&&j<ns))out.push(b.dat[i])});
 for(let i=0;i<ec;i++)blocks.forEach(b=>out.push(b.ec[i]));return out}
function build(bytes,v,mask){const s=v*4+17,M=[],F=[];for(let i=0;i<s;i++){M.push(new Array(s).fill(false));F.push(new Array(s).fill(false))}
 const set=(x,y,d)=>{if(x>=0&&x<s&&y>=0&&y<s){M[y][x]=d;F[y][x]=true}};
 for(let i=0;i<s;i++){set(6,i,i%2===0);set(i,6,i%2===0)}
 const finder=(cx,cy)=>{for(let dy=-4;dy<=4;dy++)for(let dx=-4;dx<=4;dx++){const d=Math.max(Math.abs(dx),Math.abs(dy));set(cx+dx,cy+dy,d!==2&&d!==4)}};
 finder(3,3);finder(s-4,3);finder(3,s-4);
 const ap=alignPos(v);ap.forEach((a,i)=>ap.forEach((b,j)=>{if((i===0&&j===0)||(i===0&&j===ap.length-1)||(i===ap.length-1&&j===0))return;for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++)set(a+dx,b+dy,Math.max(Math.abs(dx),Math.abs(dy))!==1)}));
 const fmt=(m)=>{const data=(0<<3)|m;let r=data;for(let i=0;i<10;i++)r=(r<<1)^((r>>>9)*0x537);const bits=((data<<10)|r)^0x5412,g=i=>((bits>>>i)&1)!==0;
  for(let i=0;i<=5;i++)set(8,i,g(i));set(8,7,g(6));set(8,8,g(7));set(7,8,g(8));for(let i=9;i<15;i++)set(14-i,8,g(i));
  for(let i=0;i<8;i++)set(s-1-i,8,g(i));for(let i=8;i<15;i++)set(8,s-15+i,g(i));set(8,s-8,true)};
 fmt(mask);
 if(v>=7){let r=v;for(let i=0;i<12;i++)r=(r<<1)^((r>>>11)*0x1f25);const bits=(v<<12)|r;for(let i=0;i<18;i++){const b=((bits>>>i)&1)!==0,a=s-11+i%3,c=Math.floor(i/3);set(a,c,b);set(c,a,b)}}
 const cw=codewords(bytes,v);let i=0;
 for(let right=s-1;right>=1;right-=2){if(right===6)right=5;for(let vert=0;vert<s;vert++)for(let j=0;j<2;j++){const x=right-j,up=((right+1)&2)===0,y=up?s-1-vert:vert;
  if(!F[y][x]&&i<cw.length*8){M[y][x]=((cw[i>>>3]>>>(7-(i&7)))&1)!==0;i++}}}
 for(let y=0;y<s;y++)for(let x=0;x<s;x++){if(F[y][x])continue;const inv=[(x+y)%2===0,y%2===0,x%3===0,(x+y)%3===0,(Math.floor(x/3)+Math.floor(y/2))%2===0,x*y%2+x*y%3===0,(x*y%2+x*y%3)%2===0,((x+y)%2+x*y%3)%2===0][mask];if(inv)M[y][x]=!M[y][x]}
 return M}
function penalty(M){const s=M.length;let p=0;const run=get=>{for(let a=0;a<s;a++){let n=1;for(let b=1;b<s;b++){if(get(a,b)===get(a,b-1)){n++;if(n===5)p+=3;else if(n>5)p++}else n=1}}};run((a,b)=>M[a][b]);run((a,b)=>M[b][a]);
 let d=0;M.forEach(r=>r.forEach(c=>{if(c)d++}));p+=Math.floor(Math.abs(d*20-s*s*10)/(s*s))*10;return p}
function matrix(text){const bytes=Array.from(new TextEncoder().encode(text));let v=1;while(v<=10&&nData(v)*8<4+(v<10?8:16)+bytes.length*8)v++;
 if(v>10)throw new Error("Texte trop long pour le QR code");let best=null,bp=1e9;for(let m=0;m<8;m++){const M=build(bytes,v,m),p=penalty(M);if(p<bp){bp=p;best=M}}return best}
function svg(text,px){const M=matrix(text),s=M.length,q=4;let d="";M.forEach((r,y)=>r.forEach((c,x)=>{if(c)d+=`M${x+q} ${y+q}h1v1h-1z`}));
 return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${s+2*q} ${s+2*q}" width="${px||200}" height="${px||200}" shape-rendering="crispEdges"><rect width="100%" height="100%" fill="#fff"/><path d="${d}"/></svg>`}
return{matrix,svg}})();
if(typeof module!=="undefined")module.exports=QR;
