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
/* World: drifting landscape from Study 02, now randomly generated      */
/* ------------------------------------------------------------------ */
var world=$('world'),scenes=[],lastType=-1,moving=true;
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
var TYPES=[
  {sky:'skyDay', body:'sun', r:[24,38],y:[70,150], fills:['#8d8d8d','#6e6e6e','#4f4f4f'],base:[290,345,405],amp:[60,45,35]},
  {sky:'skyDusk',body:'sun', r:[44,60],y:[230,280],fills:['#5a5a5a','#3f3f3f','#262626'],base:[300,350,410],amp:[55,40,30]},
  {sky:'skyNight',body:'moon',r:[18,26],y:[60,130],fills:['#3a3a3a','#2a2a2a','#1a1a1a'],base:[300,350,410],amp:[60,45,35],stars:true},
  {sky:'skyFog', body:'sun', r:[22,34],y:[80,160],fills:['#9a9a9a','#7a7a7a','#5a5a5a'],base:[300,350,410],amp:[6,9,12],sea:true},
  {sky:'skyDay', body:'sun', r:[20,30],y:[60,120],fills:['#a3a3a3','#727272','#454545'],base:[320,370,420],amp:[150,100,60],sharp:true}
];
function makeScene(){
  var ti;do{ti=Math.floor(Math.random()*TYPES.length)}while(ti===lastType);lastType=ti;
  var T=TYPES[ti],r=rng(1+Math.floor(Math.random()*233279)),g=document.createElementNS(NS,'g'),h='',i;
  h+='<rect width="'+W+'" height="'+H+'" fill="url(#'+T.sky+')"/>';
  if(T.stars)for(i=0;i<40;i++)h+='<circle cx="'+f1(r()*W)+'" cy="'+f1(r()*260)+'" r="'+f1(.6+r()*1.2)+'" fill="#fff" opacity="'+(.35+r()*.5).toFixed(2)+'"/>';
  var br=T.r[0]+r()*(T.r[1]-T.r[0]),by=T.y[0]+r()*(T.y[1]-T.y[0]);
  h+='<g class="body">'+(T.body==='moon'
    ?'<circle cy="'+f1(by)+'" r="'+f1(br)+'" fill="#e6e6e6"/><circle cx="'+f1(-br*.3)+'" cy="'+f1(by-br*.2)+'" r="'+f1(br*.22)+'" fill="#cdcdcd"/><circle cx="'+f1(br*.35)+'" cy="'+f1(by+br*.3)+'" r="'+f1(br*.14)+'" fill="#d4d4d4"/>'
    :'<circle cy="'+f1(by)+'" r="'+f1(br)+'" fill="#f4f4f4"/>')+'</g>';
  for(i=0;i<3;i++)h+='<path class="lay" fill="'+T.fills[i]+'" d="'+(T.sea?wave(r,T.base[i],T.amp[i]):ridge(r,T.base[i],T.amp[i],T.sharp))+'"/>';
  g.innerHTML=h;
  var s={g:g,body:g.querySelector('.body'),bx:120+r()*500,lays:g.querySelectorAll('.lay'),
    off:[r()*680,r()*680,r()*680],speed:[14,30,54].map(function(v){return v*(.7+r()*.6)}),op:1};
  world.appendChild(g);
  moveScene(s,0);
  return s;
}
function moveScene(s,dt){
  for(var i=0;i<3;i++){s.off[i]=(s.off[i]+s.speed[i]*calm*dt)%680;s.lays[i].setAttribute('transform','translate('+(-s.off[i]).toFixed(2)+' 0)')}
  s.bx-=6*calm*dt;if(s.bx<-80)s.bx+=W+160;
  s.body.setAttribute('transform','translate('+s.bx.toFixed(1)+' 0)');
}
/* new random background; crossfades in on top of the current one unless instant */
function newScene(instant){
  if(instant){world.innerHTML='';scenes=[]}
  var s=makeScene();
  if(!instant&&scenes.length){s.op=0;s.g.setAttribute('opacity','0')}
  scenes.push(s);
}
function updateWorld(dt){
  if(!moving)return;
  scenes.forEach(function(s){moveScene(s,dt)});
  var top=scenes[scenes.length-1];
  if(top.op<1){
    top.op=Math.min(1,top.op+dt/(RM?.2:.7));
    top.g.setAttribute('opacity',top.op.toFixed(3));
    if(top.op>=1){while(scenes.length>1)world.removeChild(scenes.shift().g);top.g.removeAttribute('opacity')}
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
var camState='idle',shots=[],ac=null,cycleT=0,CYCLE=3.2;
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
  if(cycleT>=CYCLE){cycleT=0;newScene(false)} /* random changing backgrounds while live */
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
