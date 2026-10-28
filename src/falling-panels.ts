const cube=document.querySelector<HTMLElement>('.cube')!;
const camera=document.querySelector<HTMLElement>('.camera')!;
const screens=[...document.querySelectorAll<HTMLElement>('[data-screen]')];
const buttons=[...document.querySelectorAll<HTMLButtonElement>('[data-go]')];
const overview=document.querySelector<HTMLButtonElement>('[data-overview]')!;
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
// Visit every cell once, in a snake, then continue to the next face.
const route=[0,2,1,3,4,5].flatMap(face=>[0,1,2,5,4,3,6,7,8].map(cell=>({face,cell,id:face*9+cell})));
const rotations:Record<number,[number,number]>={0:[0,0],2:[0,-90],1:[0,-180],3:[0,-270],4:[-90,0],5:[90,0]};
let current=0,target=0,size=0,last=0,touchX=0,touchY=0,active=-2;
const ease=(v:number)=>{v=Math.max(0,Math.min(1,v));return v*v*(3-2*v)};
const mix=(a:number,b:number,t:number)=>a+(b-a)*t;
const entry=(step:number)=>route[((step%route.length)+route.length)%route.length];
function resize(){size=Math.min(innerWidth,innerHeight);document.documentElement.style.setProperty('--cw',`${size}px`);document.documentElement.style.setProperty('--ch',`${size}px`)}
resize();addEventListener('resize',resize);
const go=(v:number)=>{target=Math.max(0,v)};
buttons.forEach(b=>b.addEventListener('click',()=>{
 const face=current<1?0:entry(Math.round(current)-1).face;
 go(route.findIndex(item=>item.face===face&&item.cell===Number(b.dataset.go))+1);
}));
overview.addEventListener('click',()=>go(0));
function reading(delta:number){
 if(current<.95||Math.abs(current-Math.round(current))>.03)return false;
 const s=screens[entry(Math.round(current)-1).id];
 return delta>0?s.scrollTop+s.clientHeight<s.scrollHeight-2:s.scrollTop>1;
}
addEventListener('wheel',e=>{if((e.target as HTMLElement).closest('nav'))return;const d=e.deltaY||e.deltaX;if(reading(d))return;e.preventDefault();go(target+d*(e.deltaMode===1?16:e.deltaMode===2?innerHeight:1)/900)},{passive:false});
addEventListener('touchstart',e=>{touchX=e.touches[0].clientX;touchY=e.touches[0].clientY},{passive:true});
addEventListener('touchmove',e=>{const dx=touchX-e.touches[0].clientX,dy=touchY-e.touches[0].clientY;touchX=e.touches[0].clientX;touchY=e.touches[0].clientY;const d=Math.abs(dx)>Math.abs(dy)?dx:dy;if(reading(d))return;e.preventDefault();go(target+d/450)},{passive:false});
addEventListener('keydown',e=>{
 if(e.key==='Escape'||e.key==='Home'){e.preventDefault();go(0);return}
 if((e.target as HTMLElement).closest('button,a,input,textarea'))return;
 const d=['ArrowRight','ArrowDown','PageDown',' '].includes(e.key)?1:['ArrowLeft','ArrowUp','PageUp'].includes(e.key)?-1:0;
 if(!d)return;e.preventDefault();
 if(reading(d)&&!['ArrowLeft','ArrowRight'].includes(e.key))screens[entry(Math.round(current)-1).id].scrollBy(0,d*size*.6);
 else go(Math.round(target)+d);
});
function pose(step:number){const item=entry(step),[rx,ry]=rotations[item.face];return{x:-innerWidth/2+size/2+(1-item.cell%3)*size,y:-innerHeight/2+size/2+(1-Math.floor(item.cell/3))*size,rx,ry,face:item.face}}
function frame(time:number){
 const dt=Math.min(50,time-last||16);last=time;current=reduced.matches?target:mix(current,target,1-Math.exp(-dt/140));if(Math.abs(current-target)<.0001)current=target;
 let x:number,y:number,rx:number,ry:number,scale:number;
 if(current<1){const t=ease(current),p=pose(0);scale=mix(1/5.6,1,t);x=p.x*t;y=p.y*t;rx=mix(-20,0,t);ry=mix(-30,0,t)}
 else{
  const step=Math.floor(current-1),fraction=current-1-step,t=ease(fraction),a=pose(step),b=pose(step+1);
  // Pull back during face changes so the rotation is visible.
  const pull=a.face!==b.face?Math.sin(Math.PI*fraction)**2:0;
  scale=1-.8*pull;x=mix(a.x,b.x,t)*(1-pull);y=mix(a.y,b.y,t)*(1-pull);
  const dy=((b.ry-a.ry+540)%360)-180;rx=mix(a.rx,b.rx,t);ry=a.ry+dy*t;
 }
 camera.style.transform=`translate3d(${x}px,${y}px,0)`;
 cube.style.transform=`translateZ(${-size*1.5*scale}px) scale3d(${scale},${scale},${scale}) rotateY(${ry}deg) rotateX(${rx}deg)`;
 const next=current<.95?-1:entry(Math.round(current)-1).id;
 if(next!==active){active=next;screens.forEach(s=>{const selected=Number(s.dataset.screen)===active;s.inert=!selected;s.setAttribute('aria-hidden',String(!selected))});buttons.forEach(b=>b.setAttribute('aria-current',String(active>=0&&Number(b.dataset.go)===active%9)));overview.setAttribute('aria-current',String(active<0));document.body.classList.toggle('hero-active',active>=0);document.body.dataset.activeCell=String(active)}
 requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

