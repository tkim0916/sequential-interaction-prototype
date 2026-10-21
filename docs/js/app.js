/* Pin the Moment — a sequence built from the three photo studies.
   Step 0  Film choice          click Color or Black & white film; nothing else unlocks until you choose
   Step 1  Silky Frame Reveal   pinch / scroll / + opens the viewfinder
   Step 2  Sharp Shutter        zoom, set ISO / shutter / aperture, tap the shutter; photos go to the gallery
   Step 3  Magnet Wall          Pin a photo from the gallery, drag (or arrow keys + Enter) it onto the wall
   Each step unlocks the next only on completion; the next step starts after a short pause. */
(function(){
'use strict';
var NS='http://www.w3.org/2000/svg',W=680,H=470,CX=340,CY=235;
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
  speed:100,variation:30,cycle:3.2
};
var prm=Object.assign({},DEF);
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
  h+='<g filter="url(#dof)"><rect width="'+W+'" height="'+H+'" fill="url(#'+id+')"/>';
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
  var open=true; /* the far group (sky, clouds, back layers) takes the depth-of-field blur; the front layer is in focus */
  if(prm.mShow)for(i=3-prm.mLayers;i<3;i++){
    if(i===2){h+='</g>';open=false}
    var amp=T.amp[i]*prm.mHeight/100;
    var d=T.sea?wave(rng(P.ridge[i]),T.base[i],amp):ridge(rng(P.ridge[i]),T.base[i],amp,T.sharp);
    h+='<g class="lay" data-i="'+i+'"><path fill="'+tone(T.fills[i],T.sea?'seaC':'mountC')+'" d="'+d+'"/>'+(tex&&prm.texOn==='Mountains'?texShape(tx,d):'')+'</g>';
  }
  if(open)h+='</g>';
  if(tex&&prm.texOn==='Whole scene')h+=texShape(tx);
  h+='<g filter="url(#dof)">';
  if(prm.bShow)for(i=0;i<prm.bCount;i++)h+='<path class="bd" fill="none" stroke="'+tone(T.bird,'birdC')+'" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>';
  h+='</g>';
  s.g.innerHTML=h;
  s.body=s.g.querySelector('.body');
  s.lays=Array.prototype.slice.call(s.g.querySelectorAll('.lay'));
  s.clouds=Array.prototype.slice.call(s.g.querySelectorAll('.cl'));
  s.birds=Array.prototype.slice.call(s.g.querySelectorAll('.bd'));
  moveScene(s,0);
}
function moveScene(s,dt){
  var P=s.plan,dE=dt;s.time+=dt; /* steady drift */
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
    top.g.setAttribute('opacity',top.fade.toFixed(3));
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
  if(step===1&&!done1){
    stage.focus({preventScroll:true});
    P.set(e.pointerId,{x:e.clientX,y:e.clientY});
    try{svg.setPointerCapture(e.pointerId)}catch(_){}
    begin();
  }else if(step===2&&!galOpen){ /* camera: two fingers pinch to zoom; one finger still taps the shutter */
    P.set(e.pointerId,{x:e.clientX,y:e.clientY});
    begin();
  }
});
svg.addEventListener('pointermove',function(e){
  if(!P.has(e.pointerId))return;
  P.set(e.pointerId,{x:e.clientX,y:e.clientY});
  var a=pts();
  if(a.length>=2&&pinch){
    var d=Math.hypot(a[0].x-a[1].x,a[0].y-a[1].y);
    if(step===1)push((d-pinch.d)*kk()*1.8);
    else if(step===2&&pinch.d>0)setZoom(camS.zoom*d/pinch.d);
    if(pinch)pinch.d=d;
  }
});
function up(e){if(!P.has(e.pointerId))return;P.delete(e.pointerId);begin()}
svg.addEventListener('pointerup',up);svg.addEventListener('pointercancel',up);
svg.addEventListener('wheel',function(e){
  if(step===1){e.preventDefault();push(-e.deltaY*(e.ctrlKey?1.6:.35))}
  else if(step===2&&!galOpen){e.preventDefault();setZoom(camS.zoom*Math.exp(-e.deltaY*(e.ctrlKey?.01:.002)))}
},{passive:false});
stage.addEventListener('keydown',function(e){
  if(step!==1||e.target!==stage)return;
  if(e.key==='+'||e.key==='='||e.key==='ArrowUp'){e.preventDefault();push(18)}
  else if(e.key==='-'||e.key==='_'||e.key==='ArrowDown'){e.preventDefault();push(-18)}
});
function frameReady(){
  P.clear();pinch=null;
  learn('open');
  setStatus('Camera ready');setHint('');
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
var shutter=$('shutter'),disc=$('disc'),chk=$('chk'),hint=$('hint'),flash=$('flash');
var camState='idle',photos=[],ac=null,cycleT=0,capN=0,inst=0;
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
/* --- camera settings: focal length, ISO, shutter speed, aperture (modern-camera stops) --- */
var ZOOMS=[1,1.5,2,5,10],ISO=[100,200,400,800,1600,3200,6400],SHUT=[1000,500,250,125,60,30,15,8],AP=[1.4,2,2.8,4,5.6,8,11,16];
var CDEF={zoom:1,iso:0,sh:2,ap:2}; /* 1x, ISO 100, 1/250 s, f/2.8 — the Study 02 readout is the correct exposure */
var camS=Object.assign({},CDEF),zoomC=1,film=null,lastDof=-1;
var EVREF=Math.log2(2.8*2.8*250);
function apLabel(i){return 'ƒ/'+AP[i]}
function shLabel(i){return '1/'+SHUT[i]+' s'}
function zLabel(z){return (Math.round(z*10)/10)+'x'}
function mm(z){return Math.round(26*z)+' mm'}
function evDelta(){ /* + = brighter than the reference exposure */
  var N=AP[camS.ap],t=1/SHUT[camS.sh];
  return EVREF-(Math.log2(N*N/t)-Math.log2(ISO[camS.iso]/100));
}
function dofStd(){var b=Math.max(0,4.2/AP[camS.ap]-.26);return b*(.5+.5*zoomC)/zoomC} /* wide aperture blurs the far scene */
function lensVals(motion){
  return {
    slope:clamp(Math.pow(2,evDelta()*.6),.08,6),
    grain:.06*Math.log2(ISO[camS.iso]/100),
    mb:motion?Math.min(12,3*prm.mDrift*prm.speed/100*zoomC/SHUT[camS.sh]):0, /* slow shutter smears the drift (capture only) */
    sat:film==='bw'?0:1
  };
}
function lensMarkup(id,v){
  return '<filter id="'+id+'" filterUnits="userSpaceOnUse" x="0" y="0" width="'+W+'" height="'+H+'" color-interpolation-filters="sRGB">'+
    (v.mb>.05?'<feGaussianBlur stdDeviation="'+v.mb.toFixed(2)+' 0"/>':'<feOffset/>')+
    '<feComponentTransfer>'+['R','G','B'].map(function(c){return '<feFunc'+c+' type="linear" slope="'+v.slope.toFixed(3)+'"/>'}).join('')+'</feComponentTransfer>'+
    '<feColorMatrix type="saturate" values="'+v.sat+'" result="sat"/>'+
    (v.grain>0?'<feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed="3"/><feColorMatrix type="matrix" values=".33 .33 .33 0 0 .33 .33 .33 0 0 .33 .33 .33 0 0 0 0 0 0 1" result="gn"/><feComposite in="sat" in2="gn" operator="arithmetic" k1="0" k2="1" k3="'+v.grain.toFixed(3)+'" k4="'+(-v.grain/2).toFixed(3)+'"/>':'')+
    '</filter>';
}
function dofMarkup(id,std){return '<filter id="'+id+'" x="-10%" y="-10%" width="120%" height="120%">'+(std>.05?'<feGaussianBlur stdDeviation="'+std.toFixed(2)+'"/>':'<feOffset/>')+'</filter>'}
function updateLens(){lastDof=dofStd();$('liveDefs').innerHTML=lensMarkup('lens',lensVals(false))+dofMarkup('dof',lastDof)}
function zoomTf(){return 'translate('+CX+' '+CY+') scale('+zoomC.toFixed(4)+') translate('+(-CX)+' '+(-CY)+')'}
function setZoom(z){camS.zoom=clamp(z,1,10);syncCam();if(step===2&&!learned.zoom){learn('zoom');if(camState==='idle')camHint()}}
function settingsText(){return shLabel(camS.sh)+' · '+apLabel(camS.ap)+' · ISO '+ISO[camS.iso]+' · '+zLabel(camS.zoom)}
function readyText(){return 'Ready · '+settingsText()}
function photoCount(){return photos.length+' photo'+(photos.length===1?'':'s')}
function updateZoom(dt){ /* silky ease toward the target zoom, as in Study 01 */
  if(Math.abs(camS.zoom-zoomC)<.001)return;
  zoomC+=(camS.zoom-zoomC)*(1-Math.pow(.0009,dt));
  if(Math.abs(camS.zoom-zoomC)<.002)zoomC=camS.zoom;
  world.setAttribute('transform',zoomTf());
  if(Math.abs(dofStd()-lastDof)>.02)updateLens();
}

/* the frozen frame inside the focus brackets becomes the photo, with the lens and film baked in.
   Ids get a marker so every rendered copy (gallery, thumbnail, wall) can be made unique. */
function snapshot(){
  var n=++capN;
  var m='<defs>'+lensMarkup('lens',lensVals(true))+dofMarkup('dof',dofStd())+'</defs><g filter="url(#lens)"><g transform="'+zoomTf()+'">'+world.innerHTML+'</g></g>';
  return m.replace(/id="([^"]+)"/g,'id="$1~'+n+'~"').replace(/url\(#([^)]+)\)/g,'url(#$1~'+n+'~)');
}
/* print: the centered square of the frame (full height); full: the whole frame for the lightbox */
function render(p,full){
  var k=++inst,body=p.svg.replace(/~(\d+)~/g,'_$1_'+k);
  return full?body:'<svg x="-46" y="-58" width="92" height="92" viewBox="'+(CX-H/2)+' 0 '+H+' '+H+'" preserveAspectRatio="xMidYMid slice">'+body+'</svg>';
}
function capture(){
  if(step!==2||camState!=='idle')return;
  camState='capturing';moving=false;learn('shutter');
  click();
  disc.setAttribute('r','34');
  hint.style.display='none';
  setStatus('Capturing…');setHint('');
  flash.style.transition='none';flash.style.opacity='0.95';flash.getBoundingClientRect();
  later(60,function(){flash.style.transition='opacity .4s ease-out';flash.style.opacity='0'});
  later(480,function(){
    camState='captured';
    disc.setAttribute('r','40');
    chk.setAttribute('opacity','1');
    photos.push({id:capN+1,svg:snapshot(),film:film,info:settingsText(),wall:null});
    updateGalBtn();
    setStatus('Captured · '+settingsText()+' · saved to gallery');
    setHint('Saved · tap the gallery button (bottom right) to see your photos','gallery');
    later(1200,nextShot);
  });
}
function camReset(){
  camState='idle';moving=true;cycleT=0;
  chk.setAttribute('opacity','0');
  disc.setAttribute('r','40');
  hint.style.display='';
}
function nextShot(){
  camReset();
  newScene(false); /* a fresh random scene for the next photo */
  setCount(photoCount());
  if(!galOpen){setStatus(readyText());camHint();focusInStage(shutter)}
}
shutter.addEventListener('click',capture);
shutter.addEventListener('keydown',function(e){ /* Enter/Space press the button natively; +/- zoom */
  if(e.key==='+'||e.key==='='){e.preventDefault();setZoom(camS.zoom*1.25)}
  else if(e.key==='-'||e.key==='_'){e.preventDefault();setZoom(camS.zoom/1.25)}
});

/* --- on-screen controls: zoom chips, sliding aperture strip, gallery button --- */
var zoomsEl=$('zooms'),apStrip=$('apStrip'),apBtn=$('apBtn');
zoomsEl.innerHTML=ZOOMS.map(function(z){return '<button type="button" role="radio" data-z="'+z+'">'+z+'x</button>'}).join('');
apStrip.innerHTML=AP.map(function(a,i){return '<button type="button" role="radio" data-ap="'+i+'">ƒ/'+a+'</button>'}).join('');
zoomsEl.addEventListener('click',function(e){var b=e.target.closest('[data-z]');if(b)setZoom(+b.getAttribute('data-z'))});
apStrip.addEventListener('click',function(e){var b=e.target.closest('[data-ap]');if(b){camS.ap=+b.getAttribute('data-ap');learn('aperture');syncCam();camHint()}});
shutter.addEventListener('pointerdown',function(e){e.stopPropagation()});
function setStrip(open){
  apStrip.classList.toggle('open',open);apBtn.setAttribute('aria-expanded',open?'true':'false');
  if(step===2&&camState==='idle'&&!galOpen)camHint();
}
/* hint bar: the action the user must take next */
var hintPill=$('hintPill');
/* Tutorial: each hint goes away once its action has been done; after the whole tutorial
   (open, zoom, shoot, gallery, view, pin) no hints are shown. Remembered per browser. */
var TUTORIAL=['open','zoom','shutter','gallery','view','pin'],TIPS_KEY='capturePin.learned',learned={};
try{learned=JSON.parse(localStorage.getItem(TIPS_KEY))||{}}catch(_){learned={}}
function tutorialDone(){return TUTORIAL.every(function(k){return learned[k]})}
function learn(k){
  if(learned[k])return;
  learned[k]=1;
  try{localStorage.setItem(TIPS_KEY,JSON.stringify(learned))}catch(_){}
  refreshTips();
}
function refreshTips(){
  var done=tutorialDone();
  document.querySelector('.ghint').hidden=done||(learned.view&&learned.pin);
  document.querySelector('.lb-hint').hidden=done||learned.swipe;
  if(done)setHint('');
}
function setHint(t,k){
  if(tutorialDone()||(k&&learned[k]))t='';
  hintPill.textContent=t;hintPill.classList.toggle('show',!!t);
}
function camHint(){
  if(apStrip.classList.contains('open')){setHint('Tap an ƒ-stop to set the aperture · tap ƒ again to close','aperture');return}
  var z=!learned.zoom,sh=!learned.shutter;
  setHint(z&&sh?'Pinch with two fingers or scroll the mouse wheel to zoom in or out · tap the shutter to capture'
    :z?'Pinch with two fingers or scroll the mouse wheel to zoom in or out'
    :sh?'Tap the shutter to capture'
    :photos.length&&!learned.gallery?'Tap the gallery button (bottom right) to see your photos':'');
}
apBtn.addEventListener('click',function(){setStrip(!apStrip.classList.contains('open'))});

/* --- right panel: camera settings --- */
var cpanel=$('cpanel'),cbody=$('cpanelBody'),ctoggle=$('cpanelToggle');
cbody.innerHTML=
  '<p class="pintro">Settings work like a modern camera. 1/250 s · ƒ/2.8 · ISO 100 is a correct exposure; changing one makes the image brighter or darker.</p>'+
  '<fieldset class="pg"><legend>Film</legend><p class="cfilm" id="cFilm">—</p><span class="pnote">Chosen at the start. Change it any time from the gallery.</span></fieldset>'+
  '<fieldset class="pg"><legend>Focal length</legend><div class="seg seg5" role="radiogroup" aria-label="Focal length">'+
    ZOOMS.map(function(z){return '<label><input type="radio" name="c-zoom" value="'+z+'"><span>'+z+'x<small>'+mm(z)+'</small></span></label>'}).join('')+
  '</div><span class="pnote" id="cZoomNote"></span></fieldset>'+
  '<fieldset class="pg"><legend>Exposure</legend>'+
    crow('c-iso','ISO',ISO.length-1,'Higher ISO = brighter, more grain')+
    crow('c-sh','Shutter speed',SHUT.length-1,'Slower = brighter, motion blur in the photo')+
    crow('c-ap','Aperture',AP.length-1,'Wider (smaller ƒ) = brighter, blurrier background')+
    '<div class="prow"><div class="ptop"><span class="plab">Exposure meter</span><output id="cEv"></output></div><div class="meter" aria-hidden="true"><span id="cNeedle"></span></div><span class="pnote">−3 EV (dark) to +3 EV (bright)</span></div>'+
  '</fieldset>'+
  '<div class="pactions"><button id="cReset" class="pbtn primary" type="button">Reset camera settings</button>'+
  '<button id="cTips" class="pbtn" type="button" title="Show the step-by-step hints again">Show tips again</button></div>';
function crow(id,label,max,note){
  return '<div class="prow"><div class="ptop"><label class="plab" for="'+id+'">'+label+'</label><output id="'+id+'-o"></output></div><input type="range" id="'+id+'" min="0" max="'+max+'" step="1"><span class="pnote" id="'+id+'-r"></span><span class="pnote">'+note+'</span></div>';
}
$('c-iso-r').textContent='Range ISO '+ISO[0]+'–'+ISO[ISO.length-1];
$('c-sh-r').textContent='Range 1/'+SHUT[0]+'–1/'+SHUT[SHUT.length-1]+' s';
$('c-ap-r').textContent='Range ƒ/'+AP[0]+'–ƒ/'+AP[AP.length-1];
cbody.addEventListener('input',function(e){
  var t=e.target;
  if(t.name==='c-zoom')setZoom(+t.value);
  else if(t.id==='c-iso'){camS.iso=+t.value;syncCam()}
  else if(t.id==='c-sh'){camS.sh=+t.value;syncCam()}
  else if(t.id==='c-ap'){camS.ap=+t.value;syncCam()}
});
cbody.addEventListener('keydown',function(e){e.stopPropagation()});
$('cReset').addEventListener('click',function(){camS=Object.assign({},CDEF);syncCam()});
$('cTips').addEventListener('click',function(){
  learned={};try{localStorage.removeItem(TIPS_KEY)}catch(_){}
  refreshTips();
  if(step===1)setHint('Pinch out with two fingers, scroll up, or press + to open the camera','open');
  else if(step===2&&camState==='idle'&&!galOpen)camHint();
});
function setCpanel(open){
  cpanel.classList.toggle('collapsed',!open);
  ctoggle.setAttribute('aria-expanded',open?'true':'false');
  cbody.hidden=!open;
  document.body.classList.toggle('cpanel-open',open&&!cpanel.hidden);
}
ctoggle.addEventListener('click',function(){setCpanel(cpanel.classList.contains('collapsed'))});

/* keep every control and the live lens in step with camS */
function syncCam(){
  zoomsEl.querySelectorAll('[data-z]').forEach(function(b){var on=Math.abs(+b.getAttribute('data-z')-camS.zoom)<.01;b.setAttribute('aria-checked',on?'true':'false');b.classList.toggle('on',on)});
  apStrip.querySelectorAll('[data-ap]').forEach(function(b){var on=+b.getAttribute('data-ap')===camS.ap;b.setAttribute('aria-checked',on?'true':'false');b.classList.toggle('on',on)});
  $('apLabel').textContent=apLabel(camS.ap);
  cbody.querySelectorAll('input[name="c-zoom"]').forEach(function(r){r.checked=Math.abs(+r.value-camS.zoom)<.01});
  $('cZoomNote').textContent='Current '+zLabel(camS.zoom)+' · '+mm(camS.zoom)+' equivalent · pinch, scroll or tap the chips on the screen';
  $('c-iso').value=camS.iso;$('c-iso-o').textContent='ISO '+ISO[camS.iso];
  $('c-sh').value=camS.sh;$('c-sh-o').textContent=shLabel(camS.sh);
  $('c-ap').value=camS.ap;$('c-ap-o').textContent=apLabel(camS.ap);
  var ev=evDelta();
  $('cEv').textContent=(ev>=0?'+':'−')+Math.abs(ev).toFixed(1)+' EV'+(Math.abs(ev)<.25?' · correct':ev>0?' · bright':' · dark');
  $('cNeedle').style.left=(50+clamp(ev,-3,3)/3*50)+'%';
  updateLens();
  if(step===2&&camState==='idle'&&!galOpen)setStatus(readyText());
}

/* --- gallery: every capture is saved here; pin to the wall or delete --- */
var gal=$('gallery'),galGrid=$('galGrid'),galBtn=$('galBtn'),galOpen=false;
function updateGalBtn(){
  galBtn.hidden=!photos.length;
  if(photos.length){
    $('galThumb').innerHTML=render(photos[photos.length-1]);
    $('galCount').textContent=photos.length;
    galBtn.setAttribute('aria-label','Open gallery, '+photoCount());
  }
  if(step===2)setCount(photoCount());
}
function renderGallery(){
  $('galTitle').textContent='Gallery · '+photoCount();
  $('galWall').disabled=!photos.some(function(p){return p.wall});
  if(!photos.length){galGrid.innerHTML='<p class="gempty">No photos yet. Go back to the camera and press the shutter.</p>';return}
  galGrid.innerHTML=photos.slice().reverse().map(function(p){
    return '<figure class="gitem" data-id="'+p.id+'"><button type="button" class="gphoto" data-act="view" aria-label="View photo '+p.id+' full size"><svg viewBox="-56 -68 112 136" aria-hidden="true">'+frame+render(p)+'</svg></button>'+
      '<figcaption>'+(p.film==='bw'?'B&amp;W':'Color')+' · '+p.info+'</figcaption><div class="gact">'+
      (p.wall?'<span class="onwall">On the wall</span>':'<button type="button" class="gbtn primary" data-act="pin">Pin to wall</button>')+
      '<button type="button" class="gbtn del" data-act="del">Delete</button></div></figure>';
  }).join('');
}
function syncFilmSwitch(){
  gal.querySelectorAll('[data-gfilm]').forEach(function(b){var on=b.getAttribute('data-gfilm')===film;b.classList.toggle('on',on);b.setAttribute('aria-checked',on?'true':'false')});
}
/* change film from the gallery: applies to the live view and every photo taken next */
gal.querySelector('.gfilm').addEventListener('click',function(e){
  var b=e.target.closest('[data-gfilm]');if(!b||b.getAttribute('data-gfilm')===film)return;
  setFilm(b.getAttribute('data-gfilm'));syncFilmSwitch();
  setStatus((film==='color'?'Color':'Black & white')+' film loaded · your next photos use it');
});
function setFilm(f){
  film=f;
  prm.colorOn=film==='color';syncPanel();rebuildAll(); /* the film decides color vs grayscale */
  $('cFilm').textContent=film==='color'?'Color film':'Black & white film';
  updateLens();
}
function openGallery(){
  if(step!==2)return;
  galOpen=true;learn('gallery');setStrip(false);renderGallery();syncFilmSwitch();gal.hidden=false;setHint('');
  setStatus('Gallery · tap a photo to view it, pin it to the wall, or delete it');
  $('galClose').focus({preventScroll:true});
}
function closeGallery(back){
  galOpen=false;gal.hidden=true;lb.hidden=true;afterLb=null;
  if(back!==false&&step===2){setStatus(camState==='idle'?readyText():statusEl.textContent);camHint();(photos.length?galBtn:shutter).focus({preventScroll:true})}
}
galBtn.addEventListener('click',openGallery);
$('galClose').addEventListener('click',function(){closeGallery()});
$('galWall').addEventListener('click',function(){closeGallery(false);wallMode='view';goStep(3)});
gal.addEventListener('keydown',function(e){if(e.key==='Escape'){e.preventDefault();closeGallery()}});

/* --- lightbox: full-size photo; swipe or drag down to close --- */
var lb=$('lightbox'),lbFig=$('lbFig'),lbFrom=null,lbDrag=null;
function openLightbox(p,from){
  lbFrom=from;learn('view');
  $('lbImg').innerHTML=render(p,true);
  $('lbImg').setAttribute('aria-label','Photo '+p.id);
  $('lbCap').textContent=(p.film==='bw'?'B&W':'Color')+' · '+p.info;
  lbFig.style.transition='none';lbFig.style.transform='';lb.style.setProperty('--fade','1');
  lb.hidden=false;
  requestAnimationFrame(function(){lb.classList.add('open')});
  setStatus('Full-size photo · swipe or drag down to close');
  $('lbClose').focus({preventScroll:true});
}
function closeLightbox(){
  learn('swipe');
  lb.classList.remove('open');
  lbFig.style.transition='transform .25s ease-in';lbFig.style.transform='translateY(110vh)';
  setTimeout(function(){
    lb.hidden=true;lbFig.style.transform='';
    if(afterLb!==null){var id=afterLb;afterLb=null;backToGallery(id);return}
    if(lbFrom&&document.body.contains(lbFrom))lbFrom.focus({preventScroll:true});
  },RM?0:250);
  setStatus(step===3?'Your wall':'Gallery · tap a photo to view it, pin it to the wall, or delete it');
}
lbFig.addEventListener('pointerdown',function(e){
  lbDrag={y:e.clientY,t:performance.now(),dy:0};
  try{lbFig.setPointerCapture(e.pointerId)}catch(_){}
  lbFig.style.transition='none';
});
lbFig.addEventListener('pointermove',function(e){
  if(!lbDrag)return;
  var dy=e.clientY-lbDrag.y;lbDrag.dy=dy;
  lbFig.style.transform='translateY('+(dy>0?dy:dy*.2).toFixed(1)+'px) scale('+(1-clamp(dy,0,400)/2000).toFixed(3)+')';
  lb.style.setProperty('--fade',(1-clamp(dy,0,300)/400).toFixed(3));
  /* dragged far enough down: close right away, without waiting for the release */
  if(dy>=clamp(window.innerHeight*.28,140,260)){
    lbDrag=null;
    try{lbFig.releasePointerCapture(e.pointerId)}catch(_){}
    closeLightbox();
  }
});
function lbEnd(){
  if(!lbDrag)return;
  var d=lbDrag;lbDrag=null;
  var v=d.dy/Math.max(1,performance.now()-d.t);
  if(d.dy>110||(d.dy>30&&v>.6))closeLightbox();
  else{lbFig.style.transition='transform .25s ease-out';lbFig.style.transform='';lb.style.setProperty('--fade','1')}
}
lbFig.addEventListener('pointerup',lbEnd);lbFig.addEventListener('pointercancel',lbEnd);
$('lbClose').addEventListener('click',closeLightbox);
lb.addEventListener('keydown',function(e){if(e.key==='Escape'){e.preventDefault();e.stopPropagation();closeLightbox()}});
galGrid.addEventListener('click',function(e){
  var b=e.target.closest('[data-act]');if(!b)return;
  var id=+b.closest('[data-id]').getAttribute('data-id'),p=photos.filter(function(x){return x.id===id})[0];
  if(b.getAttribute('data-act')==='view'){openLightbox(p,b);return}
  if(b.getAttribute('data-act')==='pin'){closeGallery(false);pinPhoto=p;wallMode='pin';goStep(3)}
  else if(b.getAttribute('data-confirm')){ /* second tap deletes (also takes it off the wall) */
    photos.splice(photos.indexOf(p),1);
    if(p.wall&&p.wall.parentNode)p.wall.parentNode.removeChild(p.wall);
    updateGalBtn();renderGallery();$('galClose').focus({preventScroll:true});
  }else{b.setAttribute('data-confirm','1');b.textContent='Tap again to delete';b.classList.add('confirm')}
});

/* --- film choice (step 0) --- */
var filmEl=$('film');
filmEl.addEventListener('click',function(e){
  var b=e.target.closest('[data-film]');if(!b||step!==0||film)return;
  film=b.getAttribute('data-film');
  filmEl.querySelectorAll('[data-film]').forEach(function(x){
    var on=x===b;x.classList.toggle('chosen',on);x.classList.toggle('dim',!on);x.setAttribute('aria-pressed',on?'true':'false');
    x.querySelector('.film-pick').textContent=on?'Loaded ✓':'Select';
  });
  setFilm(film);
  setStatus((film==='color'?'Color':'Black & white')+' film loaded');
  later(900,function(){goStep(1)});
});
function updateCam(dt){
  if(camState!=='idle')return;
  cycleT+=dt;
  if(cycleT>=prm.cycle){cycleT=0;newScene(false)} /* random changing backgrounds while live */
}

/* ------------------------------------------------------------------ */
/* Step 3 — Magnet Wall                                                */
/* ------------------------------------------------------------------ */
var held=$('held'),hc=$('hc'),hs=$('hs'),pinned=$('pinned'),linesEl=$('lines');
var HX=340,HY=190,drag=false,kbd=false,busy=true,cx=HX,cy=HY,off={x:0,y:0},curl=0;
var pinPhoto=null,wallMode='view',pinCount=0;
var rots=[-4,3,-2,5,-3,2],slots=[[190,150],[340,128],[490,150],[110,110],[570,110],[265,190],[415,190]];
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
function wallCount(){var n=photos.filter(function(p){return p.wall}).length;return n+' on the wall'}
function spawn(){
  linesEl.style.opacity=1;
  hc.innerHTML=frame+render(pinPhoto);
  held.style.pointerEvents='';
  held.setAttribute('aria-label','Photograph '+pinPhoto.id+'. Drag it onto the wall, or use the arrow keys to move it and Enter to pin it. Enter without moving pins it in the next spot.');
  setCount(wallCount());
  setStatus('Drag the photograph to the wall and let go to pin it');
  setHint('Drag the photo up onto the wall and let go to pin it · or use the arrow keys, then Enter','pin');
  tween(350,function(k){setHeld(HX,HY,0,0.6+0.4*k,3);held.style.opacity=k},function(){busy=false});
}
function pin(tx,ty){
  var r=rots[pinCount%rots.length];
  var g=document.createElementNS(NS,'g');
  g.setAttribute('transform','translate('+tx+' '+ty+') rotate('+r+')');
  g.innerHTML='<rect class="shadow" x="-56" y="-68" width="112" height="136" transform="translate(2 3)"/>'+frame+render(pinPhoto)+'<g class="pn"><circle cx="0" cy="0" r="6" style="fill:var(--pin)"/><circle cx="-1.8" cy="-1.8" r="2" style="fill:var(--pin-hl)"/></g>';
  pinned.appendChild(g);
  var pn=g.querySelector('.pn');
  tween(RM?1:260,function(k){pn.setAttribute('transform','translate(0 '+(-60-(1-k)*16)+') scale('+(1+(1-k)*0.7)+')')});
  held.style.opacity=0;linesEl.style.opacity=0;
  held.style.pointerEvents='none'; /* the empty hand copy sits on top of the new print; let clicks through to it */
  held.setAttribute('tabindex','-1');
  g.setAttribute('class','pin-photo');g.setAttribute('data-id',pinPhoto.id);
  g.setAttribute('role','button');g.setAttribute('aria-label','View pinned photo '+pinPhoto.id+' full size');g.setAttribute('tabindex','0');
  pinPhoto.wall=g;pinCount++;
  setCount(wallCount());
  learn('pin');
  setStatus('Pinned to the wall · back to your gallery');setHint('');
  var just=pinPhoto.id;
  later(1300,function(){ /* back to the gallery so every photo is in view (waits if a photo is open full size) */
    if(!lb.hidden){afterLb=just;return}
    backToGallery(just);
  });
}
var afterLb=null;
function backToGallery(id){
  wallMode='view';goStep(2);openGallery();
  var it=galGrid.querySelector('[data-id="'+id+'"]');
  if(it){it.classList.add('just');it.scrollIntoView({block:'nearest'});setTimeout(function(){it.classList.remove('just')},1600)}
}
function snapBack(x0,y0,r0){
  tween(260,function(k){setHeld(x0+(HX-x0)*k,y0+(HY-y0)*k,r0*(1-k),1.06-0.06*k,8-5*k)},function(){busy=false});
}
function release(){
  if(!drag)return;
  drag=false;kbd=false;busy=true;
  held.style.cursor='grab';
  var x0=cx,y0=cy,r0=clamp((cx-HX)/18,-9,9);
  if(cy>250){snapBack(x0,y0,r0);setHint('Not high enough · drag the photo further up onto the wall','pin')}
  else{
    var tx=clamp(x0,70,610),ty=clamp(y0,80,200),r1=rots[pinCount%rots.length];
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
    var s=slots[pinCount%slots.length],x0=cx,y0=cy,r1=rots[pinCount%rots.length];
    setHeld(x0,y0,0,1.06,8);
    tween(320,function(q){setHeld(x0+(s[0]-x0)*q,y0+(s[1]-y0)*q,r1*q,1.06-0.06*q,8-6*q)},function(){pin(s[0],s[1])});
    return;
  }
  if(k==='Escape'&&drag&&kbd){e.preventDefault();drag=false;kbd=false;busy=true;snapBack(cx,cy,clamp((cx-HX)/18,-9,9))}
});
held.addEventListener('blur',function(){if(drag&&kbd)release()});
function updateHand(now){
  var hinting=wallMode==='pin'&&!drag&&!busy,target=0,h=0;
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
    {key:'colorOn',label:'Use color',type:'toggle',note:'Color film turns this on. Black & white film shows everything in gray whatever is picked here.'},
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
  prm=Object.assign({},DEF,{colorOn:film==='color'});syncPanel();rebuildAll();
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
  return 'In the Pin the Moment prototype (docs/js/app.js), set the Step 2 (Sharp Shutter) background parameters to these values and make them the new defaults in the control panel (the DEF object):\n'+
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
setPanel(false); /* background controls start collapsed; the tab opens them */

/* ------------------------------------------------------------------ */
/* Sequence                                                            */
/* ------------------------------------------------------------------ */
function goStep(n){
  step=n;
  layer(fr,n<=1);layer(cue,n===1);
  layer($('worldL'),n<3);
  layer($('wallg'),n===3);
  filmEl.hidden=n!==0;
  $('camui').hidden=n!==2;
  cpanel.hidden=n===0;setCpanel(!cpanel.classList.contains('collapsed'));
  if(n!==2){setStrip(false);if(galOpen)closeGallery(false)}
  moreBtn.hidden=true;
  stage.tabIndex=n===1?0:-1;
  stage.setAttribute('role',n===1?'application':'group');
  stage.setAttribute('aria-label',n===0?'Choose your film.':n===1?'Black screen. Pinch out with two fingers, scroll, or press plus to open the camera frame.':n===2?'Camera. Zoom with the chips, a pinch, or the plus and minus keys, then press the shutter.':'Wall.');
  shutter.setAttribute('tabindex',n===2?'0':'-1');
  held.setAttribute('tabindex',n===3&&wallMode==='pin'?'0':'-1');
  setHint(n===1?'Pinch out with two fingers, scroll up, or press + to open the camera':'','open');
  pinned.querySelectorAll('.pin-photo').forEach(function(g){g.setAttribute('tabindex',n===3?'0':'-1')});
  pinned.classList.toggle('viewing',n===3);
  held.style.pointerEvents=n===3&&wallMode==='pin'?'':'none';
  if(n===0){
    setCount('Choose film');
    setStatus('Select a film to continue');
    filmEl.querySelectorAll('[data-film]').forEach(function(x){x.classList.remove('chosen','dim');x.setAttribute('aria-pressed','false');x.querySelector('.film-pick').textContent='Select'});
  }else if(n===1){
    setCount('Open the camera');
    setStatus('Pinch out, scroll, or press + to open the camera');
  }else if(n===2){
    camReset();
    setCount(photoCount());
    setStatus(readyText());camHint();
    updateGalBtn();
    focusInStage(shutter);
  }else if(wallMode==='pin'){
    busy=true;drag=false;kbd=false;
    spawn();
    focusInStage(held);
  }else{ /* view the wall from the gallery */
    busy=true;held.style.opacity=0;linesEl.style.opacity=0;
    setCount(wallCount());
    setStatus('Your wall');
    setHint('Tap a pinned photo to see it full size · press Back to camera to keep shooting','wall');
    moreBtn.hidden=false;focusInStage(moreBtn);
  }
}
function restart(){
  run++;
  P.clear();pinch=null;
  t=0;done1=false;ca=1;t0=performance.now(); /* c keeps its value so the frame eases closed, as in Study 01 */
  film=null;photos=[];pinPhoto=null;wallMode='view';pinCount=0;
  camS=Object.assign({},CDEF);zoomC=1;world.removeAttribute('transform');
  camReset();flash.style.transition='none';flash.style.opacity='0';
  pinned.innerHTML='';drag=false;kbd=false;busy=true;held.style.opacity=0;linesEl.style.opacity=0;curl=0;
  galOpen=false;gal.hidden=true;
  prm.colorOn=false;syncPanel();
  newScene(true);
  syncCam();
  goStep(0);
  updateGalBtn();
}
$('restart').addEventListener('pointerdown',function(e){e.stopPropagation()});
$('restart').addEventListener('keydown',function(e){e.stopPropagation()});
$('restart').addEventListener('click',restart);
moreBtn.addEventListener('click',function(){learn('wall');goStep(2)});
/* on the wall (View wall), a pinned photo opens full size like in the gallery */
function wallPhoto(e){
  if(step!==3||drag)return null;
  var g=e.target.closest&&e.target.closest('.pin-photo');if(!g)return null;
  var id=+g.getAttribute('data-id');return {g:g,p:photos.filter(function(x){return x.id===id})[0]};
}
pinned.addEventListener('click',function(e){var w=wallPhoto(e);if(w&&w.p)openLightbox(w.p,w.g)});
pinned.addEventListener('keydown',function(e){
  if(e.key!=='Enter'&&e.key!==' ')return;
  var w=wallPhoto(e);if(w&&w.p){e.preventDefault();openLightbox(w.p,w.g)}
});

var last=null;
function tick(now){
  if(last===null)last=now;
  var dt=Math.min(.05,(now-last)/1000);last=now;
  if(step<3)updateWorld(dt);
  if(step===1||Math.abs(t-c)>.05)updateFrame(dt,now);
  if(step===2)updateCam(dt);
  if(step<3)updateZoom(dt);
  if(step===3)updateHand(now);
  requestAnimationFrame(tick);
}
newScene(true);
setHeld(HX,HY,0,1,3);
syncCam();
setCpanel(window.matchMedia('(min-width: 1100px)').matches);
refreshTips();
goStep(0);
draw();
requestAnimationFrame(tick);
})();
