const camera=document.querySelector<HTMLElement>('.camera')!;
const world=document.querySelector<HTMLElement>('.world')!;
const stage=document.querySelector<HTMLElement>('.stage')!;
const neighborhood=document.querySelector<HTMLElement>('.neighborhood')!;
const modules=[...document.querySelectorAll<HTMLElement>('[data-module]')].map(el=>({el,x:Number(el.dataset.x),y:Number(el.dataset.y),n:Number(el.dataset.count),rotor:el.querySelector<HTMLElement>('.rotor')!,panels:[...el.querySelectorAll<HTMLElement>('.panel')]}));
const stops=modules.flatMap((m,module)=>Array.from({length:module===2?2:m.n},(_,face)=>({module,face,x:m.x+560,y:m.y+320})));
const aboutTower=modules[1].panels[0].querySelector<HTMLElement>('.about-tower')!;
let towerOffset=180,towerTarget=180,towerVelocity=0,towerFrame=0,towerLast=0;
const careerModule=2,careerStart=stops.findIndex(s=>s.module===careerModule);
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
const hint=document.querySelector<HTMLElement>('.controls-hint')!;
function dismissHint(){if(hint.contains(document.activeElement))(document.activeElement as HTMLElement).blur();hint.hidden=true;try{sessionStorage.setItem('portfolio-controls-seen','3')}catch{}}
hint.querySelector('.hint-close')!.addEventListener('click',dismissHint);
hint.querySelector('.hint-dismiss')!.addEventListener('click',dismissHint);
try{hint.hidden=sessionStorage.getItem('portfolio-controls-seen')==='3'}catch{hint.hidden=false}
let skipFlight:{from:number,to:number}|null=null;
let current=-1,target=-1,raf=0,last=0,zoom=1,isOverview=false,viewMix=0,touchX=0,touchY=0,selected=-1;
const clamp=(n:number,a:number,b:number)=>Math.max(a,Math.min(b,n));
const ease=(v:number)=>v*v*(3-2*v);
const mix=(a:number,b:number,t:number)=>a+(b-a)*t;
function animateTower(time:number){
 towerFrame=0;
 const dt=Math.min((time-towerLast)/1000||1/60,1/30);towerLast=time;
 // Nearly critical damping: a weighted follow-through without a rubbery bounce.
 towerVelocity+=(24*(towerTarget-towerOffset)-10*towerVelocity)*dt;
 towerOffset+=towerVelocity*dt;
 if(Math.abs(towerTarget-towerOffset)<.03&&Math.abs(towerVelocity)<.08){
  towerOffset=towerTarget;towerVelocity=0;towerLast=0;
  aboutTower.style.transform=`translateY(${towerOffset}px)`;
  aboutTower.style.removeProperty('will-change');
  return;
 }
 aboutTower.style.transform=`translateY(${towerOffset.toFixed(3)}px)`;
 towerFrame=requestAnimationFrame(animateTower);
}
function aimTower(offset:number){
 towerTarget=offset;
 if(reduced.matches){
  cancelAnimationFrame(towerFrame);towerFrame=0;towerLast=0;towerVelocity=0;towerOffset=offset;
  aboutTower.style.transform=`translateY(${offset}px)`;
  aboutTower.style.removeProperty('will-change');return;
 }
 if(!towerFrame&&Math.abs(towerTarget-towerOffset)>.001){
  towerLast=0;aboutTower.style.willChange='transform';
  towerFrame=requestAnimationFrame(animateTower);
 }
}
aboutTower.style.transform='translateY(180px)';
// Each row owns both the duct and its card, so their alignment never drifts.
const careerContents=modules[careerModule].panels.map(p=>p.querySelector<HTMLElement>('.career-content')!);
let careerMotion=1,careerAim=1,careerSpeed=0,careerRaf=0,careerLast=0;
function paintCareer(){
 careerContents.forEach((el,i)=>{
  const shift=Math.round(clamp(careerMotion-(careerStart+i%2),-1,1)*-2200)/100;
  el.style.setProperty('--career-shift',`${shift}px`);
 });
}
function animateCareer(time:number){
 careerRaf=0;
 const dt=Math.min((time-careerLast)/1000||1/60,1/30);careerLast=time;
 careerSpeed+=(28*(careerAim-careerMotion)-11*careerSpeed)*dt;
 careerMotion+=careerSpeed*dt;
 if(Math.abs(careerAim-careerMotion)<.001&&Math.abs(careerSpeed)<.003){
  careerMotion=careerAim;careerSpeed=0;careerLast=0;paintCareer();return;
 }
 paintCareer();careerRaf=requestAnimationFrame(animateCareer);
}
function aimCareer(position:number){
 const next=reduced.matches?position:clamp(position,careerStart-1,careerStart+2);
 if(reduced.matches){
  cancelAnimationFrame(careerRaf);careerRaf=0;careerSpeed=0;careerLast=0;careerMotion=next;careerAim=next;
  careerContents.forEach(el=>el.style.setProperty('--career-shift','0px'));return;
 }
 if(next===careerAim)return;
 careerAim=next;
 if(!careerRaf){careerLast=0;careerRaf=requestAnimationFrame(animateCareer)}
}
paintCareer();
// Move the actual interactive panel into a flat host; never duplicate its handlers.
const flatViewport=document.createElement('div');flatViewport.className='flat-viewport';document.body.append(flatViewport);
const flatHost=document.createElement('div');
flatHost.setAttribute('role','main');flatHost.setAttribute('aria-label','Portfolio section');
flatHost.className='flat-section';flatHost.hidden=true;flatViewport.append(flatHost);
let flatPanel:HTMLElement|null=null,flatMarker:Comment|null=null;
function exitFlat(){
 if(!flatPanel)return;
 flatMarker!.replaceWith(flatPanel);
 flatPanel=null;flatMarker=null;flatHost.replaceChildren();flatHost.hidden=true;
 stage.style.display='';
}
function enterFlat(index:number){
 if(flatPanel)return;
 const stop=stops[index],panel=modules[stop.module].panels[stop.face];
 flatMarker=document.createComment('panel-home');panel.before(flatMarker);
 flatPanel=panel;
 flatHost.style.top='50%';
 flatHost.style.transform=`translate(-50%,-50%) scale(${zoom})`;
 // Preserve the small neighboring strips on very wide or tall viewports.
 const halfW=innerWidth/(2*zoom),halfH=innerHeight/(2*zoom);
 for(const [i,m] of modules.entries()){
  if(i===stop.module)continue;
  const x=m.x-stops[index].x+560,y=m.y-stops[index].y+320;
  if(x>=560+halfW||x+1120<=560-halfW||y>=320+halfH||y+640<=320-halfH)continue;
  const face=i<stop.module?(i===careerModule?1:m.n-1):0;
  const neighbor=m.panels[face].cloneNode(true) as HTMLElement;
  neighbor.inert=true;neighbor.setAttribute('aria-hidden','true');
  neighbor.classList.add('flat-neighbor');
  Object.assign(neighbor.style,{left:x+'px',top:y+'px',width:'1120px',height:'640px',right:'auto',bottom:'auto'});
  flatHost.append(neighbor);
 }
 flatHost.append(panel);flatHost.hidden=false;stage.style.display='none';
 setTrafficActive(false);
}
// One low-frequency visibility check; hidden traffic advances only its clock.
const cars=[...document.querySelectorAll<HTMLElement>('.moving-car')].map(el=>({
 el,visible:false,bounds:el.querySelector<HTMLElement>('.car-bounds')!,
 drive:el.getAnimations().find(a=>(a as CSSAnimation).animationName==='drive-through')
}));
cars.forEach(car=>{car.el.style.visibility='hidden';car.el.style.setProperty('--car-play','paused')});
let trafficActive=false,trafficElapsed=0,trafficStarted=0,trafficTimer=0;
function trafficTick(){
 if(!trafficActive)return;
 const time=trafficElapsed+performance.now()-trafficStarted;
 for(const car of cars){
  if(!car.drive||car.drive.playState==='idle')car.drive=car.el.getAnimations().find(a=>(a as CSSAnimation).animationName==='drive-through');
  if(!car.visible&&car.drive){car.drive.pause();car.drive.currentTime=time}
 }
 const visible=cars.map(car=>{const r=car.bounds.getBoundingClientRect();return r.right>-220&&r.left<innerWidth+220&&r.bottom>-150&&r.top<innerHeight+150});
 cars.forEach((car,i)=>{
  if(car.visible===visible[i])return;
  car.visible=visible[i];
  car.el.style.visibility=car.visible?'visible':'hidden';
  car.el.style.setProperty('--car-play',car.visible?'running':'paused');
  if(car.visible)car.drive?.play();else car.drive?.pause();
 });
 trafficTimer=window.setTimeout(trafficTick,250);
}
function setTrafficActive(active:boolean){
 if(active===trafficActive)return;
 if(!active){
  trafficElapsed+=performance.now()-trafficStarted;clearTimeout(trafficTimer);
  cars.forEach(car=>{car.visible=false;car.drive?.pause();car.el.style.setProperty('--car-play','paused');car.el.style.visibility='hidden'});
 }else{trafficStarted=performance.now()}
 trafficActive=active;
 if(active)trafficTick();
}
function wake(){exitFlat();if(!raf){last=0;raf=requestAnimationFrame(render)}}
function resize(){zoom=Math.min(innerWidth/1120,innerHeight/640);wake()}
function go(value:number){skipFlight=null;isOverview=false;target=clamp(value,-1,stops.length-1);wake()}
function scrollRoute(delta:number){go(target+delta)}
function skipBlock(direction:number){
 dismissHint();
 const index=Math.max(0,Math.round(target));
 const module=stops[index].module;
 const destination=target<0&&direction>0?0:module+direction;
 const to=destination<0?-1:destination>=modules.length?stops.length-1:stops.findIndex(s=>s.module===destination);
 const from=Math.max(0,Math.round(current));
 go(to);
 if(current>=0&&to>=0&&stops[from].module!==stops[to].module)skipFlight={from:current,to};
}
function handleArrow(key:string,direction:number){
 dismissHint();
 if(target<0){skipBlock(direction);return}
 const index=Math.round(target),stop=stops[index],module=modules[stop.module];
 const neighbor=modules[stop.module+1]??modules[stop.module-1];
 const vertical=stop.module===careerModule?false:neighbor.y!==module.y;
 const verticalKey=key==='ArrowUp'||key==='ArrowDown';
 if(stop.module===careerModule&&verticalKey){go(Math.round(target)+direction);return}
 if(module.n>1&&verticalKey!==vertical){
  // Rotation stays inside this case; the travel axis is the explicit exit.
  const first=index-stop.face;
  go(first+clamp(stop.face+direction,0,module.n-1));
 }else if(verticalKey===vertical||module.n===1){
  skipBlock(direction);
 }
}
addEventListener('wheel',e=>{if((e.target as HTMLElement).closest('nav,.controls-hint'))return;e.preventDefault();scrollRoute((e.deltaY||e.deltaX)*(e.deltaMode===1?16:e.deltaMode===2?innerHeight:1)/750)},{passive:false});
addEventListener('touchstart',e=>{touchX=e.touches[0].clientX;touchY=e.touches[0].clientY},{passive:true});
addEventListener('touchmove',e=>{if((e.target as HTMLElement).closest('nav,.controls-hint'))return;const dx=touchX-e.touches[0].clientX,dy=touchY-e.touches[0].clientY;touchX=e.touches[0].clientX;touchY=e.touches[0].clientY;e.preventDefault();scrollRoute((Math.abs(dx)>Math.abs(dy)?dx:dy)/450)},{passive:false});
let lastArrowAt=0;
addEventListener('keydown',e=>{
 if((e.target as HTMLElement).closest('input,textarea,select,[contenteditable=true]'))return;
 if(e.key==='Escape'&&!hint.hidden){e.preventDefault();dismissHint();return}
 const direction=['ArrowRight','ArrowDown'].includes(e.key)?1:['ArrowLeft','ArrowUp'].includes(e.key)?-1:0;
 if(direction){e.preventDefault();const now=performance.now();if(!e.repeat||now-lastArrowAt>400){lastArrowAt=now;handleArrow(e.key,direction)}return}
 if(e.key==='Escape'){isOverview=!isOverview;wake();return}
 if((e.target as HTMLElement).closest('button,a'))return;
 const step=['PageDown',' '].includes(e.key)?1:e.key==='PageUp'?-1:0;
 if(step){e.preventDefault();go(Math.round(target)+step)}
 if(e.key==='Home'){e.preventDefault();go(0)}
 if(e.key==='End'){e.preventDefault();go(stops.length-1)}
},{capture:true});
function render(time:number){
 raf=0;const dt=Math.min(50,time-last||16);last=time;const smoothing=reduced.matches?1:1-Math.exp(-dt/125);
 current=mix(current,target,smoothing);if(Math.abs(current-target)<.0001)current=target;
 aimCareer(current);
 // The image follows the route with its own bounded spring, without holding scroll.
 // Keep the Figma crop at the section center and reveal more of the tower in transit.
 const nextTowerOffset=reduced.matches?0:Math.round((1-clamp(current,0,2))*18000)/100;
 if(nextTowerOffset!==towerTarget||reduced.matches)aimTower(nextTowerOffset);
 viewMix=mix(viewMix,isOverview?1:0,smoothing);if(Math.abs(viewMix-(isOverview?1:0))<.0001)viewMix=isOverview?1:0;
 const routePosition=Math.max(0,current);
 const lo=Math.floor(routePosition),hi=Math.min(lo+1,stops.length-1);
 const a=skipFlight?stops[Math.round(skipFlight.from)]:stops[lo];
 const b=skipFlight?stops[skipFlight.to]:stops[hi];
 const t=skipFlight?ease(clamp((current-skipFlight.from)/(skipFlight.to-skipFlight.from),0,1)):ease(routePosition-lo);
 const rotating=a.module===b.module&&a.face!==b.face;
 const turning=a.module!==b.module&&a.x===b.x;
 // Camera coordinates stay fixed throughout every case; only its rotor changes.
 const cx=mix(a.x,b.x,t),cy=mix(a.y,b.y,t);
 const entrance=ease(clamp(current+1,0,1));
 // Fade leaf surfaces: opacity on the 3D parent would flatten the entire street.
 const sceneAlpha=Math.max(viewMix,1-ease(clamp((entrance-.45)/.55,0,1)));
 neighborhood.style.setProperty('--scene-alpha',sceneAlpha.toFixed(4));
 neighborhood.style.visibility=sceneAlpha>.0001?'visible':'hidden';
 neighborhood.style.setProperty('--car-play',sceneAlpha>.0001&&!document.hidden&&!reduced.matches?'running':'paused');
 setTrafficActive(sceneAlpha>.0001&&!document.hidden&&!reduced.matches);
 const overviewZoom=Math.min(innerWidth/5300,(innerHeight-100)/4800);
 const scale=mix(mix(zoom*.64,zoom,entrance),overviewZoom,viewMix);
 const entryOffset=56*(1-entrance);
 const centerX=mix(mix(760,cx-entryOffset,entrance),2200,viewMix),centerY=mix(mix(200,cy,entrance),1700,viewMix);
 camera.style.top='50%';
 camera.style.transform=`scale3d(${scale},${scale},${scale}) rotateX(${mix((1-entrance)*-24,-24,viewMix)}deg) rotateY(${mix((1-entrance)*-20,-18,viewMix)}deg)`;
 world.style.transform=`translate3d(${-centerX}px,${-centerY}px,0)`;
 modules.forEach((m,index)=>{
  let face=skipFlight?0:index<a.module?(index===careerModule?1:m.n-1):0;
  if(index===a.module)face=a.face;
  if(rotating&&index===a.module)face=mix(a.face,b.face,t);
  if(m.n>1){const radius=(index===careerModule?320:560)/Math.tan(Math.PI/m.n);m.rotor.style.transform=`translateZ(${-radius}px) rotate${index===careerModule?'X':'Y'}(${-face*360/m.n}deg)`}
  m.el.style.visibility=entrance<.99||viewMix>.01||Math.abs(m.x-cx)<2500&&Math.abs(m.y-cy)<1450?'visible':'hidden';
 });
 const active=isOverview||current<-.1||skipFlight&&current!==target?-1:Math.round(routePosition);
 if(selected!==active){selected=active;modules.forEach((m,i)=>m.panels.forEach((p,f)=>{const enabled=active>=0&&stops[active].module===i&&stops[active].face===f;p.inert=!enabled;p.setAttribute('aria-hidden',String(!enabled))}));}
 if(current===target)skipFlight=null;
 if(current===target&&target>=0&&Number.isInteger(target)&&viewMix===0&&!isOverview)enterFlat(target);
 if(current!==target||viewMix!==(isOverview?1:0))raf=requestAnimationFrame(render);
}
addEventListener('resize',resize);resize();


document.querySelectorAll<HTMLButtonElement>('[data-go]').forEach(b=>b.onclick=()=>go(1));






addEventListener('visibilitychange',()=>{
 setTrafficActive(!document.hidden&&!flatPanel&&neighborhood.style.visibility!=='hidden'&&!reduced.matches);
});
reduced.addEventListener('change',wake);
