/* Capture & Pin — one linear sequence built from the three photo studies.
   Step 1  Silky Frame Reveal  pinch / scroll / + opens the viewfinder
   Step 2  Sharp Shutter       tap the shutter, three times (the scene changes randomly between shots)
   Step 3  Magnet Wall         drag (or arrow keys + Enter) each captured photo onto the wall
   Each step unlocks the next only on completion; the next step starts after a short pause. */
(function(){
'use strict';
var NS='http://www.w3.org/2000/svg',W=680,H=470,CX=340,CY=235,N=3;
var $=function(i){return document.getElementById(i)};
var svg=$('svg'),stage=$('stage'),statusEl=$('status'),countEl=$('count'),moreBtn=$('more');
var RM=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
var calm=RM?0.3:1;
var step=0,run=0; /* run increments on restart; stale timers and tweens check it and stop */

function clamp(v,a,b){return Math.max(a,Math.min(b,v))}
function ss(a,b,v){v=clamp((v-a)/(b-a),0,1);return v*v*(3-2*v)}
function f1(n){return n.toFixed(1)}
function later(ms,fn){var tok=run;return setTimeout(function(){if(tok===run)fn()},ms)}
function tween(ms,fn,done){
  var tok=run,t0=performance.now();
  function f(t){if(tok!==run)return;var k=Math.min(1,(t-t0)/ms),e=1-Math.pow(1-k,3);fn(e);if(k<1)requestAnimationFrame(f);else if(done)done()}
  requestAnimationFrame(f);
}
function setStatus(s){statusEl.textContent=s}
function setCount(s){countEl.textContent=s}
function layer(el,on){el.classList.toggle('off',!on);el.setAttribute('aria-hidden',on?'false':'true')}
function focusInStage(el){
  var a=document.activeElement;
  if(!a||a===document.body||stage.contains(a)||a===moreBtn)el.focus({preventScroll:true});
}

/* ------------------------------------------------------------------ */
/* World: drifting landscape from Study 02, now randomly generated.     */
/* Every visual and motion property reads from prm (the control panel). */
/* ------------------------------------------------------------------ */
var world=$('world'),scenes=[],lastType=-1,moving=true,gid=0;
var DEF={
  mShow:true,mLayers:3,mHeight:100,mDrift:30,
  cShow:true,cCount:3,cSize:100,cSpeed:12,cOpacity:80,
  bShow:true,bCount:3,bSpan:14,bSpeed:45,bFlap:3,
  colorOn:false,skyC:'#7fb2e0',mountC:'#5d7f52',seaC:'#3f7396',cloudC:'#ffffff',sunC:'#ffcf5a',moonC:'#e6e9f2',birdC:'#2b2b2b',colorAmt:100,
  texture:'None',texOn:'Whole scene',texAmt:35,texScale:3,
  speed:100,variation:30,easing:'Linear',cycle:3.2
};
var prm=Object.assign({},DEF);
var EASE={
  'Linear':function(x){return x},
  'Ease In':function(x){return x*x*x},
  'Ease Out':function(x){return 1-Math.pow(1-x,3)},
  'Ease In-Out':function(x){return x<.5?4*x*x*x:1-Math.pow(-2*x+2,3)/2}
};
/* eased clock: within each scene-change cycle the drift follows the chosen curve,
   covering the same distance per cycle as Linear */
function eased(t){var P=prm.cycle,n=Math.floor(t/P);return P*(n+EASE[prm.easing](t/P-n))}
/* gray value 0 (black) – 1 (white) -> CSS colour. Grayscale like the studies by default; with
   "Use color" on, the element's picked hue and saturation are applied while the gray value keeps
   the light/dark structure (a luminosity blend). */
function hsl(hex){
  var n=parseInt(hex.slice(1),16),r=(n>>16&255)/255,g=(n>>8&255)/255,b=(n&255)/255;
  var mx=Math.max(r,g,b),mn=Math.min(r,g,b),l=(mx+mn)/2,d=mx-mn,h=0,sa=0;
  if(d){sa=d/(1-Math.abs(2*l-1));h=mx===r?((g-b)/d)%6:mx===g?(b-r)/d+2:(r-g)/d+4;h=(h*60+360)%360}
  return [h,sa];
}
function tone(v,role){
  v=clamp(v,0,1);
  if(!prm.colorOn||!role){v=Math.round(v*255);return 'rgb('+v+','+v+','+v+')'}
  var a=prm.colorAmt/100,c=hsl(prm[role]),L=v+(.5-v)*.3*a;
  return 'hsl('+c[0].toFixed(0)+','+(c[1]*a*100).toFixed(0)+'%,'+(L*100).toFixed(1)+'%)';
}
/* texture defs for one scene (kept inside the scene so captured photos keep their texture) */
function texDefs(id){
  var k=prm.texScale,T=prm.texture;
  if(T==='Grain'||T==='Paper')return '<filter id="'+id+'" x="0" y="0" width="1" height="1"><feTurbulence type="fractalNoise" baseFrequency="'+(T==='Grain'?1/(k*1.2):1/(k*14)).toFixed(4)+'" numOctaves="'+(T==='Grain'?2:4)+'" seed="7" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/><feComposite operator="in" in2="SourceAlpha"/></filter>';
  if(T==='Halftone')return '<pattern id="'+id+'" width="'+f1(k*2.5)+'" height="'+f1(k*2.5)+'" patternUnits="userSpaceOnUse"><circle cx="'+f1(k*1.25)+'" cy="'+f1(k*1.25)+'" r="'+f1(k*.6)+'" fill="#000"/></pattern>';
  if(T==='Lines')return '<pattern id="'+id+'" width="'+f1(k*3)+'" height="'+f1(k*3)+'" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="'+f1(k*.7)+'" height="'+f1(k*3)+'" fill="#000"/></pattern>';
  return '';
}
/* an overlay shape carrying the texture: d is a path, or omitted for a full-frame rect */
function texShape(id,d){
  var T=prm.texture,op=(prm.texAmt/100).toFixed(2),filt=T==='Grain'||T==='Paper';
  var paint=filt?'fill="#fff" filter="url(#'+id+')"':'fill="url(#'+id+')"';
  return d?'<path d="'+d+'" '+paint+' opacity="'+op+'" pointer-events="none"/>':'<rect width="'+W+'" height="'+H+'" '+paint+' opacity="'+op+'" pointer-events="none"/>';
}
function rng(seed){var s=seed;return function(){s=(s*9301+49297)%233280;return s/233280}}
/* ridge(): Study 02's procedural silhouette; 16 points repeat every 680 so the 1360-wide path wraps seamlessly */
function ridge(r,base,amp,sharp){
  var ys=[],i,k,d;
  for(i=0;i<16;i++)ys.push(sharp?(i%2?base-amp*(.7+.3*r()):base-amp*.15*r()):base-r()*amp);
  d='M0 '+H+' L0 '+f1(ys[0]);
  for(k=1;k<=32;k++)d+=' L'+(k*42.5)+' '+f1(ys[k%16]);
  return d+' L1360 '+H+' Z';
}
function wave(r,base,amp){
  var wl=[85,136,170][Math.floor(r()*3)],ph=r()*6.283,d='M0 '+H,x;
  for(x=0;x<=1360;x+=8.5)d+=' L'+x+' '+f1(base+amp*Math.sin(x/wl*6.283+ph));
  return d+' L1360 '+H+' Z';
}
/* gray values (0 black – 1 white) per scene kind */
var TYPES=[
  {name:'day',  sky:[.85,.71,.55],body:'sun', bodyV:.96,r:[24,38],y:[70,150], fills:[.55,.43,.31],base:[290,345,405],amp:[60,45,35],cloud:.97,bird:.2},
  {name:'dusk', sky:[.54,.77,.89],body:'sun', bodyV:.97,r:[44,60],y:[230,280],fills:[.35,.25,.15],base:[300,350,410],amp:[55,40,30],cloud:.88,bird:.15},
  {name:'night',sky:[.08,.16,.23],body:'moon',bodyV:.9, r:[18,26],y:[60,130], fills:[.23,.165,.10],base:[300,350,410],amp:[60,45,35],cloud:.42,bird:.62,stars:true},
  {name:'sea',  sky:[.91,.84,.76],body:'sun', bodyV:.96,r:[22,34],y:[80,160], fills:[.6,.48,.35],base:[300,350,410],amp:[6,9,12],cloud:.98,bird:.25,sea:true},
  {name:'peaks',sky:[.85,.71,.55],body:'sun', bodyV:.96,r:[20,30],y:[60,120], fills:[.64,.45,.27],base:[320,370,420],amp:[150,100,60],cloud:.97,bird:.2,sharp:true}
];
var LAYK=[14/30,1,54/30]; /* back, middle, front layer speed relative to Drift speed (Study 02: 14, 30, 54 px/s) */
var MAXC=8,MAXB=12;
function makePlan(){
  var r=rng(1+Math.floor(Math.random()*233279)),i,p={ridge:[],layR:[],stars:[],clouds:[],birds:[]};
  for(i=0;i<3;i++){p.ridge.push(1+Math.floor(r()*233279));p.layR.push(r())}
  p.bodyK=r();p.bodyY=r();p.sunR=r();
  for(i=0;i<40;i++)p.stars.push([r()*W,r()*260,.6+r()*1.2,.35+r()*.5]);
  for(i=0;i<MAXC;i++)p.clouds.push({y:40+r()*150,k:.7+r()*.6,sr:r(),b:[r(),r(),r()],x:r()*(W+200)-100});
  for(i=0;i<MAXB;i++)p.birds.push({y:50+r()*170,sr:r(),ph:r()*6.283,x:r()*(W+60)-30});
  p.off=[r()*680,r()*680,r()*680];p.bx=120+r()*500;
  return p;
}
function makeScene(){
  var ti;do{ti=Math.floor(Math.random()*TYPES.length)}while(ti===lastType);lastType=ti;
  var P=makePlan(),g=document.createElementNS(NS,'g');
  var s={T:TYPES[ti],plan:P,g:g,time:0,fade:1,off:P.off.slice(),bx:P.bx,
    cx:P.clouds.map(function(c){return c.x}),bxs:P.birds.map(function(b){return b.x})};
  world.appendChild(g);
  build(s);
  return s;
}
/* (re)draw a scene from its plan and the current parameters; positions carry over */
function build(s){
  var T=s.T,P=s.plan,h='',i,id='sky'+(++gid),tx='tex'+gid,tex=prm.texture!=='None'&&prm.texAmt>0;
  h+='<defs><linearGradient id="'+id+'" x1="0" y1="0" x2="0" y2="1">'+T.sky.map(function(v,j){return '<stop offset="'+(j/(T.sky.length-1))+'" stop-color="'+tone(v,'skyC')+'"/>'}).join('')+'</linearGradient>'+(tex?texDefs(tx):'')+'</defs>';
  h+='<rect width="'+W+'" height="'+H+'" fill="url(#'+id+')"/>';
  if(tex&&prm.texOn==='Sky')h+=texShape(tx);
  if(T.stars)P.stars.forEach(function(st){h+='<circle cx="'+f1(st[0])+'" cy="'+f1(st[1])+'" r="'+f1(st[2])+'" fill="'+tone(.97)+'" opacity="'+st[3].toFixed(2)+'"/>'});
  var br=T.r[0]+P.bodyK*(T.r[1]-T.r[0]),by=T.y[0]+P.bodyY*(T.y[1]-T.y[0]);
  h+='<g class="body">'+(T.body==='moon'
    ?'<circle cy="'+f1(by)+'" r="'+f1(br)+'" fill="'+tone(T.bodyV,'moonC')+'"/><circle cx="'+f1(-br*.3)+'" cy="'+f1(by-br*.2)+'" r="'+f1(br*.22)+'" fill="'+tone(T.bodyV-.1,'moonC')+'"/><circle cx="'+f1(br*.35)+'" cy="'+f1(by+br*.3)+'" r="'+f1(br*.14)+'" fill="'+tone(T.bodyV-.07,'moonC')+'"/>'
    :'<circle cy="'+f1(by)+'" r="'+f1(br)+'" fill="'+tone(T.bodyV,'sunC')+'"/>')+'</g>';
  if(prm.cShow)for(i=0;i<prm.cCount;i++){
    var c=P.clouds[i],w=prm.cSize*c.k;
    h+='<g class="cl" fill="'+tone(T.cloud,'cloudC')+'" opacity="'+(prm.cOpacity/100).toFixed(2)+'"><ellipse rx="'+f1(w/2)+'" ry="'+f1(w*.14)+'"/><circle cx="'+f1(-w*.18)+'" cy="'+f1(-w*.08)+'" r="'+f1(w*(.14+.06*c.b[0]))+'"/><circle cx="'+f1(w*.05)+'" cy="'+f1(-w*.13)+'" r="'+f1(w*(.18+.06*c.b[1]))+'"/><circle cx="'+f1(w*.24)+'" cy="'+f1(-w*.05)+'" r="'+f1(w*(.11+.05*c.b[2]))+'"/></g>';
  }
  if(prm.mShow)for(i=3-prm.mLayers;i<3;i++){
    var amp=T.amp[i]*prm.mHeight/100;
    var d=T.sea?wave(rng(P.ridge[i]),T.base[i],amp):ridge(rng(P.ridge[i]),T.base[i],amp,T.sharp);
    h+='<g class="lay" data-i="'+i+'"><path fill="'+tone(T.fills[i],T.sea?'seaC':'mountC')+'" d="'+d+'"/>'+(tex&&prm.texOn==='Mountains'?texShape(tx,d):'')+'</g>';
  }
  if(tex&&prm.texOn==='Whole scene')h+=texShape(tx);
  if(prm.bShow)for(i=0;i<prm.bCount;i++)h+='<path class="bd" fill="none" stroke="'+tone(T.bird,'birdC')+'" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>';
  s.g.innerHTML=h;
  s.body=s.g.querySelector('.body');
  s.lays=Array.prototype.slice.call(s.g.querySelectorAll('.lay'));
  s.clouds=Array.prototype.slice.call(s.g.querySelectorAll('.cl'));
  s.birds=Array.prototype.slice.call(s.g.querySelectorAll('.bd'));
  moveScene(s,0);
}
function moveScene(s,dt){
  var P=s.plan,dE=dt?eased(s.time+dt)-eased(s.time):0;s.time+=dt;
  var sm=prm.speed/100*calm,va=prm.variation/100;
  function v(base,rv){return base*(1+va*(2*rv-1))*sm} /* per-element speed: ± variation around the base */
  s.lays.forEach(function(el){
    var i=+el.getAttribute('data-i');
    s.off[i]=(s.off[i]+v(prm.mDrift*LAYK[i],P.layR[i])*dE)%680;
    el.setAttribute('transform','translate('+(-s.off[i]).toFixed(2)+' 0)');
  });
  s.bx-=v(6,P.sunR)*dE;if(s.bx<-80)s.bx+=W+160;
  s.body.setAttribute('transform','translate('+s.bx.toFixed(1)+' 0)');
  s.clouds.forEach(function(el,i){
    var c=P.clouds[i],w=prm.cSize*c.k,span=W+w*1.2;
    s.cx[i]-=v(prm.cSpeed,c.sr)*dE;
    if(s.cx[i]<-w*.6)s.cx[i]+=span;else if(s.cx[i]>W+w*.6)s.cx[i]-=span;
    el.setAttribute('transform','translate('+s.cx[i].toFixed(1)+' '+c.y.toFixed(1)+')');
  });
  s.birds.forEach(function(el,i){
    var b=P.birds[i],a=prm.bSpan/2;
    s.bxs[i]+=v(prm.bSpeed,b.sr)*dE;if(s.bxs[i]>W+30)s.bxs[i]-=W+60;
    var ph=s.time*prm.bFlap*6.283+b.ph,ty=-a*.6*Math.sin(ph),cy=-a*.3+ty*.25;
    el.setAttribute('d','M'+f1(-a)+' '+f1(ty)+'Q'+f1(-a*.45)+' '+f1(cy)+' 0 0Q'+f1(a*.45)+' '+f1(cy)+' '+f1(a)+' '+f1(ty));
    el.setAttribute('transform','translate('+s.bxs[i].toFixed(1)+' '+(b.y+4*Math.sin(s.time*1.3+b.ph)).toFixed(1)+')');
  });
}
function rebuildAll(){scenes.forEach(build)}
/* new random background; crossfades in on top of the current one unless instant */
function newScene(instant){
  if(instant){world.innerHTML='';scenes=[]}
  var s=makeScene();
  if(!instant&&scenes.length>0){s.fade=0;s.g.setAttribute('opacity','0')}
  scenes.push(s);
}
function updateWorld(dt){
  if(!moving)return;
  scenes.forEach(function(s){moveScene(s,dt)});
  var top=scenes[scenes.length-1];
  if(top.fade<1){
    top.fade=Math.min(1,top.fade+dt/(RM?.2:.7));
    top.g.setAttribute('opacity',EASE[prm.easing](top.fade).toFixed(3));
    if(top.fade>=1){while(scenes.length>1)world.removeChild(scenes.shift().g);top.g.removeAttribute('opacity')}
  }
}

/* ------------------------------------------------------------------ */
/* Step 1 — Silky Frame Reveal                                         */
/* ------------------------------------------------------------------ */
var fr=$('fr'),cue=$('cue'),MAX=400,t=0,c=0,done1=false,ca=1,t0=performance.now();
var P=new Map(),pinch=null;
function push(d){
  if(step!==1||done1)return;
  t=clamp(t+d,0,MAX);
  if(t>=MAX-1){t=MAX;done1=true;frameReady()}
}
function draw(){
  var p=c/MAX,e=ss(.85,1,p),sw=p*W-10*e,sh=p*H-10*e,h=''; /* at full reveal the frame sits just inside the edge */
  var mk=1-.62*ss(.82,1,p); /* surround stays black, then settles to a soft dim once revealed */
  if(sh>=3){
    var x0=CX-sw/2,y0=CY-sh/2,x1=CX+sw/2,y1=CY+sh/2,u=Math.min(sw,sh),R=u*.083,L=u*.183,a=ss(0,.12,p);
    h+='<path fill-rule="evenodd" d="M0 0H'+W+'V'+H+'H0Z M'+f1(x0+R)+' '+f1(y0)+'H'+f1(x1-R)+'Q'+f1(x1)+' '+f1(y0)+' '+f1(x1)+' '+f1(y0+R)+'V'+f1(y1-R)+'Q'+f1(x1)+' '+f1(y1)+' '+f1(x1-R)+' '+f1(y1)+'H'+f1(x0+R)+'Q'+f1(x0)+' '+f1(y1)+' '+f1(x0)+' '+f1(y1-R)+'V'+f1(y0+R)+'Q'+f1(x0)+' '+f1(y0)+' '+f1(x0+R)+' '+f1(y0)+'Z" fill="#000" fill-opacity="'+mk.toFixed(3)+'"/>';
    h+='<rect x="'+f1(x0)+'" y="'+f1(y0)+'" width="'+f1(sw)+'" height="'+f1(sh)+'" rx="'+f1(R)+'" fill="none" stroke="#fff" stroke-opacity="'+(.35*a).toFixed(3)+'"/>';
    var ga=(.28*ss(.25,.9,p)).toFixed(3);h+='<g stroke="#fff" stroke-opacity="'+ga+'">';
    for(var k=1;k<3;k++){var gx=x0+sw/3*k,gy=y0+sh/3*k;h+='<line x1="'+f1(gx)+'" y1="'+f1(y0)+'" x2="'+f1(gx)+'" y2="'+f1(y1)+'"/><line x1="'+f1(x0)+'" y1="'+f1(gy)+'" x2="'+f1(x1)+'" y2="'+f1(gy)+'"/>'}
    h+='</g><g fill="none" stroke="#fff" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round" filter="url(#sh)" opacity="'+a.toFixed(3)+'">';
    [[x0,y0,1,1],[x1,y0,-1,1],[x0,y1,1,-1],[x1,y1,-1,-1]].forEach(function(q){var X=q[0],Y=q[1],sx=q[2],sy=q[3];
      h+='<path d="M'+f1(X)+' '+f1(Y+sy*L)+'V'+f1(Y+sy*R)+'Q'+f1(X)+' '+f1(Y)+' '+f1(X+sx*R)+' '+f1(Y)+'H'+f1(X+sx*L)+'"/>'});
    var rr=u*.067,g=u*.108,ee=u*.0245,fa=ss(.35,1,p).toFixed(3);
    h+='</g><g fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" filter="url(#sh)" opacity="'+fa+'"><circle cx="'+CX+'" cy="'+CY+'" r="'+f1(rr)+'" stroke-opacity=".9"/><path d="M'+f1(CX-g)+' '+CY+'H'+f1(CX-g+ee)+'M'+f1(CX+g-ee)+' '+CY+'H'+f1(CX+g)+'M'+CX+' '+f1(CY-g)+'V'+f1(CY-g+ee)+'M'+CX+' '+f1(CY+g-ee)+'V'+f1(CY+g)+'"/></g>';
  }else h+='<rect width="'+W+'" height="'+H+'" fill="#000"/>';
  fr.innerHTML=h;
}
/* hint: two fingers spreading apart with diagonal arrows, shown on the black screen */
var Z=1.5;
function arrow(x,y,dx,dy,z){var px=-dy,py=dx;return 'M'+f1(x-dx*z*.4+px*z*.4)+' '+f1(y-dy*z*.4+py*z*.4)+'L'+f1(x+dx*z*.4)+' '+f1(y+dy*z*.4)+'L'+f1(x-dx*z*.4-px*z*.4)+' '+f1(y-dy*z*.4-py*z*.4)}
function drawCue(now){
  if(ca<.01){cue.innerHTML='';return}
  var ph=((now-t0)/2600)%1,k=.7071;
  var pe=ph<.7?ss(0,.7,ph):1,d=(14+pe*38)*Z,r=7*Z,ax=CX-d*k,ay=CY+d*k,bx=CX+d*k,by=CY-d*k,w=d+26*Z,z=11*Z;
  var st1='fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"';
  var dot=function(x,y){return '<circle cx="'+f1(x)+'" cy="'+f1(y)+'" r="'+r*2+'" fill="#fff" fill-opacity=".16" stroke="#fff" stroke-opacity=".8" stroke-width="1.6"/><circle cx="'+f1(x)+'" cy="'+f1(y)+'" r="'+r+'" fill="#fff"/>'};
  var fadeOut=ph>.88?1-(ph-.88)/.12:1;
  cue.setAttribute('opacity',(ca*fadeOut).toFixed(3));
  cue.innerHTML='<line '+st1+' x1="'+f1(ax)+'" y1="'+f1(ay)+'" x2="'+f1(bx)+'" y2="'+f1(by)+'" stroke-opacity=".3" stroke-dasharray="2 6"/>'+dot(ax,ay)+dot(bx,by)+
    '<path '+st1+' stroke-opacity=".85" d="'+arrow(CX-w*k,CY+w*k,-k,k,z)+arrow(CX+w*k,CY-w*k,k,-k,z)+'"/>';
}
function kk(){return 400/svg.getBoundingClientRect().width} /* screen px -> openness units, as in Study 01 */
function pts(){return Array.from(P.values())}
function begin(){var a=pts();pinch=a.length>=2?{d:Math.hypot(a[0].x-a[1].x,a[0].y-a[1].y)}:null}
svg.addEventListener('pointerdown',function(e){
  if(step!==1||done1)return;
  stage.focus({preventScroll:true});
  P.set(e.pointerId,{x:e.clientX,y:e.clientY});
  try{svg.setPointerCapture(e.pointerId)}catch(_){}
  begin();
});
svg.addEventListener('pointermove',function(e){
  if(step!==1||!P.has(e.pointerId))return;
  P.set(e.pointerId,{x:e.clientX,y:e.clientY});
  var a=pts();
  if(a.length>=2&&pinch){var d=Math.hypot(a[0].x-a[1].x,a[0].y-a[1].y);push((d-pinch.d)*kk()*1.8);if(pinch)pinch.d=d}
});
function up(e){if(!P.has(e.pointerId))return;P.delete(e.pointerId);begin()}
svg.addEventListener('pointerup',up);svg.addEventListener('pointercancel',up);
svg.addEventListener('wheel',function(e){if(step!==1)return;e.preventDefault();push(-e.deltaY*(e.ctrlKey?1.6:.35))},{passive:false});
stage.addEventListener('keydown',function(e){
  if(step!==1||e.target!==stage)return;
  if(e.key==='+'||e.key==='='||e.key==='ArrowUp'){e.preventDefault();push(18)}
  else if(e.key==='-'||e.key==='_'||e.key==='ArrowDown'){e.preventDefault();push(-18)}
});
function frameReady(){
  P.clear();pinch=null;
  setStatus('Camera ready');
  later(900,function(){goStep(2)});
}
function updateFrame(dt,now){
  c+=(t-c)*(1-Math.pow(.0009,dt)); /* silky ease toward the pinch */
  if(Math.abs(t-c)<.05)c=t;
  draw();
  ca+=(((step===1&&!done1&&t<4&&!P.size)?1:0)-ca)*(1-Math.pow(.02,dt));
  drawCue(now);
}

/* ------------------------------------------------------------------ */
/* Step 2 — Sharp Shutter                                              */
/* ------------------------------------------------------------------ */
var shutter=$('shutter'),disc=$('disc'),chk=$('chk'),hint=$('hint'),br=$('br'),b1=$('b1'),b2=$('b2'),flash=$('flash');
var camState='idle',shots=[],ac=null,cycleT=0;
var READY='Ready · tap the shutter',DONE='Captured · 1/250 s · f/2.8 · ISO 100';
function click(){ /* synthesized shutter: two band-passed noise bursts and a low thump */
  try{
    ac=ac||new (window.AudioContext||window.webkitAudioContext)();
    if(ac.state==='suspended')ac.resume();
    var t=ac.currentTime,len=Math.floor(ac.sampleRate*0.05),buf=ac.createBuffer(1,len,ac.sampleRate),d=buf.getChannelData(0),i;
    for(i=0;i<len;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/len,3);
    [[0,2800,0.5],[0.07,1800,0.4]].forEach(function(p){
      var s=ac.createBufferSource();s.buffer=buf;
      var f=ac.createBiquadFilter();f.type='bandpass';f.frequency.value=p[1];f.Q.value=0.9;
      var g=ac.createGain();g.gain.value=p[2];
      s.connect(f);f.connect(g);g.connect(ac.destination);s.start(t+p[0]);
    });
    var o=ac.createOscillator(),og=ac.createGain();
    o.type='sine';o.frequency.setValueAtTime(180,t);o.frequency.exponentialRampToValueAtTime(60,t+0.08);
    og.gain.setValueAtTime(0.35,t);og.gain.exponentialRampToValueAtTime(0.001,t+0.09);
    o.connect(og);og.connect(ac.destination);o.start(t);o.stop(t+0.1);
  }catch(e){}
}
/* the frozen frame inside the focus brackets becomes the print's photo */
function snapshot(){
  var g=world.cloneNode(true);
  g.removeAttribute('id');g.removeAttribute('class');g.removeAttribute('aria-hidden');
  return '<svg x="-46" y="-58" width="92" height="92" viewBox="'+(CX-100)+' '+(CY-100)+' 200 200" preserveAspectRatio="xMidYMid slice">'+g.innerHTML+'</svg>';
}
function capture(){
  if(step!==2||camState!=='idle')return;
  camState='capturing';moving=false;
  click();
  disc.setAttribute('r','34');
  hint.style.display='none';
  setStatus('Capturing…');
  flash.style.transition='none';flash.style.opacity='0.95';flash.getBoundingClientRect();
  later(60,function(){flash.style.transition='opacity .4s ease-out';flash.style.opacity='0'});
  later(480,function(){
    camState='captured';
    disc.setAttribute('r','40');
    chk.setAttribute('opacity','1');
    br.style.transform='scale(0.92)';
    b1.style.strokeOpacity='1';b1.setAttribute('stroke-width','3.5');
    b2.style.strokeOpacity='1';
    shots.push(snapshot());
    setStatus(DONE+' · '+shots.length+' of '+N);
    later(1200,function(){if(shots.length<N)nextShot();else goStep(3)});
  });
}
function camReset(){
  camState='idle';moving=true;cycleT=0;
  chk.setAttribute('opacity','0');
  disc.setAttribute('r','40');
  br.style.transform='scale(1)';
  b1.style.strokeOpacity='';b1.setAttribute('stroke-width','2.5');
  b2.style.strokeOpacity='';
  hint.style.display='';
}
function nextShot(){
  camReset();
  newScene(false); /* a fresh random scene for the next photo */
  setCount('Photo '+(shots.length+1)+' of '+N);
  setStatus(READY);
  focusInStage(shutter);
}
shutter.addEventListener('click',capture);
shutter.addEventListener('keydown',function(e){if(e.key==='Enter'||e.key===' '){e.preventDefault();capture()}});
function updateCam(dt){
  if(camState!=='idle')return;
  cycleT+=dt;
  if(cycleT>=prm.cycle){cycleT=0;newScene(false)} /* random changing backgrounds while live */
}

/* ------------------------------------------------------------------ */
/* Step 3 — Magnet Wall                                                */
/* ------------------------------------------------------------------ */
var held=$('held'),hc=$('hc'),hs=$('hs'),pinned=$('pinned'),linesEl=$('lines');
var HX=340,HY=190,idx=0,drag=false,kbd=false,busy=true,cx=HX,cy=HY,off={x:0,y:0},curl=0;
var rots=[-4,3,-2],slots=[[190,150],[340,128],[490,150]];
var frame='<rect x="-56" y="-68" width="112" height="136" fill="#f5f5f5" stroke="#bbb" stroke-width="0.5"/><rect x="-26" y="46" width="52" height="4" fill="#ccc"/>';
var starts=[[306,290],[342,274],[378,292]];
var tips=[[306,226],[330,206],[354,206],[378,228]];
function pt(e){var p=svg.createSVGPoint();p.x=e.clientX;p.y=e.clientY;return p.matrixTransform(svg.getScreenCTM().inverse())}
function setHand(k){
  for(var i=0;i<4;i++){
    var f=$('hf'+i);
    f.setAttribute('x2',tips[i][0]+(340-tips[i][0])*0.28*k);
    f.setAttribute('y2',tips[i][1]+38*k);
  }
  var th=$('hth');th.setAttribute('x2',262+30*k);th.setAttribute('y2',290-4*k);
}
function setHeld(x,y,r,s,lift){
  cx=x;cy=y;
  held.setAttribute('transform','translate('+x+' '+y+') rotate('+r+') scale('+s+')');
  hs.setAttribute('transform','translate('+lift+' '+(lift*1.3)+')');
  var ends=[[x-30,y+70],[x,y+70],[x+30,y+70]];
  for(var i=0;i<3;i++){var l=$('ml'+i);l.setAttribute('x1',starts[i][0]);l.setAttribute('y1',starts[i][1]);l.setAttribute('x2',ends[i][0]);l.setAttribute('y2',ends[i][1])}
}
function setMsg(){
  if(idx<N){
    setCount('Photo '+(idx+1)+' of '+N);
    setStatus('Drag the photograph to the wall and let go to pin it');
  }else{
    setCount(N+' of '+N+' pinned');
    setStatus('All three photos are on the wall. Want to take more photos?');
  }
}
function spawn(){
  linesEl.style.opacity=1;
  if(idx>=N){ /* complete: the finished wall and an invitation to start again */
    held.style.opacity=0;linesEl.style.opacity=0;busy=true;held.setAttribute('tabindex','-1');
    setMsg();moreBtn.hidden=false;focusInStage(moreBtn);return;
  }
  hc.innerHTML=frame+shots[idx];
  held.setAttribute('aria-label','Photograph '+(idx+1)+' of '+N+'. Drag it onto the wall, or use the arrow keys to move it and Enter to pin it. Enter without moving pins it in the next spot.');
  setMsg();
  tween(350,function(k){setHeld(HX,HY,0,0.6+0.4*k,3);held.style.opacity=k},function(){busy=false});
}
function pin(tx,ty){
  var r=rots[idx%N];
  var g=document.createElementNS(NS,'g');
  g.setAttribute('transform','translate('+tx+' '+ty+') rotate('+r+')');
  g.innerHTML='<rect class="shadow" x="-56" y="-68" width="112" height="136" transform="translate(2 3)"/>'+frame+shots[idx]+'<g class="pn"><circle cx="0" cy="0" r="6" style="fill:var(--pin)"/><circle cx="-1.8" cy="-1.8" r="2" style="fill:var(--pin-hl)"/></g>';
  pinned.appendChild(g);
  var pn=g.querySelector('.pn');
  tween(RM?1:260,function(k){pn.setAttribute('transform','translate(0 '+(-60-(1-k)*16)+') scale('+(1+(1-k)*0.7)+')')});
  held.style.opacity=0;
  idx++;
  later(420,spawn);
}
function snapBack(x0,y0,r0){
  tween(260,function(k){setHeld(x0+(HX-x0)*k,y0+(HY-y0)*k,r0*(1-k),1.06-0.06*k,8-5*k)},function(){busy=false});
}
function release(){
  if(!drag)return;
  drag=false;kbd=false;busy=true;
  held.style.cursor='grab';
  var x0=cx,y0=cy,r0=clamp((cx-HX)/18,-9,9);
  if(cy>250){snapBack(x0,y0,r0)}
  else{
    var tx=clamp(x0,70,610),ty=clamp(y0,80,200),r1=rots[idx%N];
    tween(180,function(k){setHeld(x0+(tx-x0)*k,y0+(ty-y0)*k,r0+(r1-r0)*k,1.06-0.06*k,8-6*k)},function(){pin(tx,ty)});
  }
}
held.addEventListener('pointerdown',function(e){
  if(step!==3||busy||drag)return;
  drag=true;
  held.setPointerCapture(e.pointerId);
  var p=pt(e);off={x:cx-p.x,y:cy-p.y};
  held.style.cursor='grabbing';
  setHeld(cx,cy,0,1.06,8);
  e.preventDefault();
});
held.addEventListener('pointermove',function(e){
  if(!drag||kbd)return;
  var p=pt(e);
  var x=clamp(p.x+off.x,56,624),y=clamp(p.y+off.y,68,410);
  setHeld(x,y,clamp((x-HX)/18,-9,9),1.06,8);
});
held.addEventListener('pointerup',function(){if(!kbd)release()});
held.addEventListener('pointercancel',function(){if(!kbd)release()});
/* keyboard path (new): arrows lift and move the print, Enter/Space lets go, Escape returns it to the hand.
   Enter while the print is still in the hand pins it straight to the next spot. */
held.addEventListener('keydown',function(e){
  if(step!==3)return;
  var k=e.key,S=e.shiftKey?40:14,dx=0,dy=0;
  if(k==='ArrowLeft')dx=-S;else if(k==='ArrowRight')dx=S;else if(k==='ArrowUp')dy=-S;else if(k==='ArrowDown')dy=S;
  if(dx||dy){
    e.preventDefault();
    if(!drag){if(busy)return;drag=true;kbd=true}
    if(!kbd)return;
    var x=clamp(cx+dx,56,624),y=clamp(cy+dy,68,410);
    setHeld(x,y,clamp((x-HX)/18,-9,9),1.06,8);
    return;
  }
  if(k==='Enter'||k===' '){
    e.preventDefault();
    if(drag&&kbd){release();return}
    if(drag||busy)return;
    busy=true;
    var s=slots[idx%N],x0=cx,y0=cy,r1=rots[idx%N];
    setHeld(x0,y0,0,1.06,8);
    tween(320,function(q){setHeld(x0+(s[0]-x0)*q,y0+(s[1]-y0)*q,r1*q,1.06-0.06*q,8-6*q)},function(){pin(s[0],s[1])});
    return;
  }
  if(k==='Escape'&&drag&&kbd){e.preventDefault();drag=false;kbd=false;busy=true;snapBack(cx,cy,clamp((cx-HX)/18,-9,9))}
});
held.addEventListener('blur',function(){if(drag&&kbd)release()});
function updateHand(now){
  var hinting=!drag&&!busy&&idx<N,target=0,h=0;
  if(drag)target=0.9;
  else if(hinting&&!RM){
    var p=((now/1000)%2.8)/2.8;
    h=p<0.55?Math.sin(p/0.55*Math.PI):0;
    target=h*0.9;
  }
  curl+=(target-curl)*0.22;
  setHand(curl);
  if(hinting)setHeld(HX,HY+9*h,0,1-0.03*h,3+2*h);
}

/* ------------------------------------------------------------------ */
/* Background controls panel (Step 2 scene)                            */
/* ------------------------------------------------------------------ */
var GROUPS=[
  {name:'Mountains',items:[
    {key:'mShow',label:'Show mountains',type:'toggle'},
    {key:'mLayers',label:'Layers',min:1,max:3,step:1,unit:'layers'},
    {key:'mHeight',label:'Peak height',min:25,max:200,step:5,unit:'%'},
    {key:'mDrift',label:'Drift speed',min:0,max:120,step:1,unit:'px/s',motion:true,note:'Middle layer; back ×0.47, front ×1.8'}]},
  {name:'Clouds',items:[
    {key:'cShow',label:'Show clouds',type:'toggle'},
    {key:'cCount',label:'Count',min:0,max:MAXC,step:1,unit:'clouds'},
    {key:'cSize',label:'Size',min:40,max:200,step:5,unit:'px wide'},
    {key:'cSpeed',label:'Drift speed',min:0,max:80,step:1,unit:'px/s',motion:true},
    {key:'cOpacity',label:'Opacity',min:10,max:100,step:5,unit:'%'}]},
  {name:'Birds',items:[
    {key:'bShow',label:'Show birds',type:'toggle'},
    {key:'bCount',label:'Count',min:0,max:MAXB,step:1,unit:'birds'},
    {key:'bSpan',label:'Wingspan',min:6,max:30,step:1,unit:'px'},
    {key:'bSpeed',label:'Flight speed',min:10,max:150,step:1,unit:'px/s',motion:true},
    {key:'bFlap',label:'Wingbeat',min:.5,max:6,step:.5,unit:'Hz',motion:true}]},
  {name:'Color',items:[
    {key:'colorOn',label:'Use color',type:'toggle',note:'Off keeps the studies’ grayscale. Picking a color turns it on.'},
    {key:'skyC',label:'Sky',type:'color'},
    {key:'mountC',label:'Mountains',type:'color'},
    {key:'seaC',label:'Sea',type:'color'},
    {key:'cloudC',label:'Clouds',type:'color'},
    {key:'sunC',label:'Sun',type:'color'},
    {key:'moonC',label:'Moon',type:'color'},
    {key:'birdC',label:'Birds',type:'color'},
    {key:'colorAmt',label:'Color strength',min:0,max:100,step:5,unit:'%',note:'Light and shade still follow each scene’s grays'}]},
  {name:'Texture',items:[
    {key:'texture',label:'Texture',type:'choice',options:['None','Grain','Paper','Halftone','Lines']},
    {key:'texOn',label:'Apply to',type:'choice',options:['Whole scene','Sky','Mountains']},
    {key:'texAmt',label:'Strength',min:0,max:100,step:5,unit:'%'},
    {key:'texScale',label:'Scale',min:1,max:10,step:.5,unit:'px',note:'Size of the grain, dots or line spacing'}]},
  {name:'Speed & motion',items:[
    {key:'speed',label:'Overall speed',min:0,max:300,step:5,unit:'%',motion:true},
    {key:'variation',label:'Speed variation',min:0,max:100,step:5,pre:'±',unit:'%',motion:true,note:'Random spread per mountain layer, cloud and bird'},
    {key:'easing',label:'Motion curve',type:'choice',options:['Linear','Ease In','Ease Out','Ease In-Out'],motion:true,note:'Applied to each scene-change cycle and to the crossfade'},
    {key:'cycle',label:'Scene change every',min:1,max:10,step:.1,unit:'s',motion:true}]}
];
var panel=$('panel'),panelBody=$('panelBody'),panelToggle=$('panelToggle'),copyBtn=$('copyPrompt'),ctl={};
function num(it,v){return it.step<1?(+v).toFixed(1):String(v)}
function fmt(it,v){return (it.pre||'')+num(it,v)+(it.unit?' '+it.unit:'')}
function span(it){return (it.pre||'')+num(it,it.min)+'–'+(it.pre||'')+num(it,it.max)+(it.unit?' '+it.unit:'')}
function buildPanel(){
  var html='';
  GROUPS.forEach(function(g){
    html+='<fieldset class="pg"><legend>'+g.name+'</legend>';
    g.items.forEach(function(it){
      var id='p-'+it.key;
      if(it.type==='toggle'){
        html+='<label class="prow tog"><input type="checkbox" id="'+id+'" data-k="'+it.key+'"><span>'+it.label+'</span></label>'+(it.note?'<span class="pnote">'+it.note+'</span>':'');
      }else if(it.type==='color'){
        html+='<label class="prow pcol" for="'+id+'"><span class="plab">'+it.label+'</span><span class="pcv"><output id="'+id+'-o"></output><input type="color" id="'+id+'" data-k="'+it.key+'"></span></label>';
      }else if(it.type==='choice'){
        html+='<div class="prow"><span class="plab" id="'+id+'-l">'+it.label+'</span><div class="seg" role="radiogroup" aria-labelledby="'+id+'-l">'+
          it.options.map(function(o){return '<label><input type="radio" name="'+id+'" value="'+o+'" data-k="'+it.key+'"><span>'+o+'</span></label>'}).join('')+'</div>'+
          (it.note?'<span class="pnote">'+it.note+'</span>':'')+'</div>';
      }else{
        html+='<div class="prow"><div class="ptop"><label class="plab" for="'+id+'">'+it.label+'</label><output id="'+id+'-o" for="'+id+'"></output></div>'+
          '<input type="range" id="'+id+'" data-k="'+it.key+'" min="'+it.min+'" max="'+it.max+'" step="'+it.step+'">'+
          '<span class="pnote">Range '+span(it)+(it.note?' · '+it.note:'')+'</span></div>';
      }
      ctl[it.key]=it;
    });
    html+='</fieldset>';
  });
  panelBody.querySelector('.pgroups').innerHTML=html;
  syncPanel();
}
function syncPanel(){
  Object.keys(ctl).forEach(function(k){
    var it=ctl[k],id='p-'+k;
    if(it.type==='toggle')$(id).checked=prm[k];
    else if(it.type==='color'){$(id).value=prm[k];$(id+'-o').textContent=prm[k]}
    else if(it.type==='choice')panelBody.querySelectorAll('input[name="'+id+'"]').forEach(function(r){r.checked=r.value===prm[k]});
    else{$(id).value=prm[k];$(id+'-o').textContent=fmt(it,prm[k])}
  });
}
panelBody.addEventListener('input',function(e){
  var k=e.target.getAttribute('data-k');if(!k)return;
  var it=ctl[k];
  if(it.type==='toggle')prm[k]=e.target.checked;
  else if(it.type==='color'){prm[k]=e.target.value;$('p-'+k+'-o').textContent=prm[k];if(!prm.colorOn){prm.colorOn=true;$('p-colorOn').checked=true}}
  else if(it.type==='choice')prm[k]=e.target.value;
  else{prm[k]=+e.target.value;$('p-'+k+'-o').textContent=fmt(it,prm[k])}
  if(!it.motion)rebuildAll(); /* visual changes redraw the scene in place; motion changes apply on the next frame */
});
panelBody.addEventListener('keydown',function(e){e.stopPropagation()});
$('pReset').addEventListener('click',function(){ /* reset state: restart the background animation, keep the settings */
  newScene(true);cycleT=0;
});
$('pDefaults').addEventListener('click',function(){ /* restore defaults: put every control back */
  prm=Object.assign({},DEF);syncPanel();rebuildAll();
});
function promptText(){
  var lines=GROUPS.map(function(g){
    return '- '+g.name+': '+g.items.map(function(it){
      var v=prm[it.key];
      if(it.type==='toggle')return it.label.toLowerCase()+' '+(v?'on':'off');
      if(it.type==='choice'||it.type==='color')return it.label.toLowerCase()+' '+v;
      return it.label.toLowerCase()+' '+fmt(it,v);
    }).join(', ');
  });
  return 'In the Capture & Pin prototype (docs/js/app.js), set the Step 2 (Sharp Shutter) background parameters to these values and make them the new defaults in the control panel (the DEF object):\n'+
    lines.join('\n')+'\n\nDEF = '+JSON.stringify(prm);
}
copyBtn.addEventListener('click',function(){
  var txt=promptText(),label=copyBtn.textContent;
  function ok(){copyBtn.textContent='Copied';setTimeout(function(){copyBtn.textContent=label},1500)}
  function fallback(){
    var ta=document.createElement('textarea');ta.value=txt;ta.setAttribute('readonly','');ta.style.position='fixed';ta.style.opacity='0';
    document.body.appendChild(ta);ta.select();
    try{document.execCommand('copy');ok()}catch(_){copyBtn.textContent='Copy failed'}
    document.body.removeChild(ta);
  }
  if(navigator.clipboard&&window.isSecureContext)navigator.clipboard.writeText(txt).then(ok,fallback);else fallback();
});
function setPanel(open){
  panel.classList.toggle('collapsed',!open);
  panelToggle.setAttribute('aria-expanded',open?'true':'false');
  panelBody.hidden=!open;
  document.body.classList.toggle('panel-open',open);
}
panelToggle.addEventListener('click',function(){setPanel(panel.classList.contains('collapsed'))});
buildPanel();
setPanel(window.matchMedia('(min-width: 1100px)').matches);

/* ------------------------------------------------------------------ */
/* Sequence                                                            */
/* ------------------------------------------------------------------ */
function goStep(n){
  step=n;
  layer(fr,n===1);layer(cue,n===1);
  layer(world,n<3);
  layer($('cam'),n===2);
  layer($('wallg'),n===3);
  stage.tabIndex=n===1?0:-1;
  stage.setAttribute('role',n===1?'application':'group');
  stage.setAttribute('aria-label',n===1?'Black screen. Pinch out with two fingers, scroll, or press plus to open the camera frame.':n===2?'Camera. Press the shutter to capture a photo.':'Wall. Pin each captured photograph to the wall.');
  shutter.setAttribute('tabindex',n===2?'0':'-1');
  held.setAttribute('tabindex',n===3?'0':'-1');
  if(n===1){
    setCount('Open the camera');
    setStatus('Pinch out, scroll, or press + to open the camera');
  }else if(n===2){
    camReset();
    setCount('Photo 1 of '+N);
    setStatus(READY);
    focusInStage(shutter);
  }else{
    idx=0;busy=true;
    spawn();
    focusInStage(held);
  }
}
function restart(){
  run++;
  P.clear();pinch=null;
  t=0;done1=false;ca=1;t0=performance.now(); /* c keeps its value so the frame eases closed, as in Study 01 */
  shots=[];camReset();flash.style.transition='none';flash.style.opacity='0';
  pinned.innerHTML='';idx=0;drag=false;kbd=false;busy=true;held.style.opacity=0;linesEl.style.opacity=0;curl=0;
  moreBtn.hidden=true;
  newScene(true);
  goStep(1);
  stage.focus({preventScroll:true});
}
$('restart').addEventListener('pointerdown',function(e){e.stopPropagation()});
$('restart').addEventListener('keydown',function(e){e.stopPropagation()});
$('restart').addEventListener('click',restart);
moreBtn.addEventListener('click',restart);

var last=null;
function tick(now){
  if(last===null)last=now;
  var dt=Math.min(.05,(now-last)/1000);last=now;
  if(step<3)updateWorld(dt);
  if(step===1||Math.abs(t-c)>.05)updateFrame(dt,now);
  if(step===2)updateCam(dt);
  if(step===3)updateHand(now);
  requestAnimationFrame(tick);
}
newScene(true);
setHeld(HX,HY,0,1,3);
goStep(1);
draw();
requestAnimationFrame(tick);
})();
