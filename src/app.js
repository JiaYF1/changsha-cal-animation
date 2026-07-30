import * as THREE from "three";
import grid from "./airport-grid.json";

const DURATION = 52;
const COLORS = {orange:0xff6a35,amber:0xf3a51e,cyan:0x59ddca,soil:0xb95e3e,rock:0x78817c,surface:0xd7ded8,dark:0x0a0d0c};
const CHAPTERS = [
  {start:0,end:6,title:"四类原始数据进入模型",short:"原始数据",desc:"计算范围、原始地面高程、基岩顶部高程和设计底标高依次进入模型；画面标注与数据同步出现。",camera:[18,10,21]},
  {start:6,end:12,title:"离散点生成连续曲面",short:"建立曲面",desc:"已知高程点作为约束，离散光滑插值在点之间快速生成连续三角网曲面。",camera:[17,9,19]},
  {start:12,end:20,title:"设计标高形成开挖底面",short:"设计开挖面",desc:"设计底标高连接为橙色开挖面。它与原始地表共同限定每个网格单元需要开挖的垂向范围。",camera:[18,8,18]},
  {start:20,end:30,title:"封闭并提取总开挖体",short:"总开挖体",desc:"在计算范围内，原始地表以下、设计开挖面以上的空间被封闭成总开挖包络体，此时尚不区分土和岩。",camera:[16,7,17]},
  {start:30,end:42,title:"基岩顶面切分土与岩",short:"土岩剖分",desc:"剖切图直接标出土方与石方开挖范围：基岩顶面以上计土，以下计岩，并处理两种曲面未相交的情况。",camera:[11,5,13]},
  {start:42,end:52,title:"计算成果与甲方结果对比",short:"结果对比",desc:"直接对比甲方计算结果与中南院计算结果，并给出差值和土石方占比。",camera:[19,13,22]},
];
const TIME_MAP = [[0,8],[6,22],[12,36],[20,48],[30,63],[42,77],[52,94]];
const RESULTS = [
  ["总范围",21657621.99,22249200.00,591578.01,null],
  ["总范围土方",11287574.95,11138600.00,-148974.95,0.50063],
  ["总范围石方",10370047.04,11110600.00,740552.96,0.49937],
];

const $ = (selector) => document.querySelector(selector);
const app = $("#app");
const canvas = $("#scene");
const renderer = new THREE.WebGLRenderer({canvas,antialias:true,alpha:false,preserveDrawingBuffer:true,powerPreference:"high-performance"});
renderer.setPixelRatio(Math.min(devicePixelRatio,1.7));
renderer.setClearColor(COLORS.dark,1);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = false;

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(COLORS.dark,0.018);
const camera = new THREE.PerspectiveCamera(38,1,0.1,120);
scene.add(new THREE.HemisphereLight(0xbfd2c5,0x151b18,1.5));
const keyLight = new THREE.DirectionalLight(0xffd6bd,2.6); keyLight.position.set(10,20,15); scene.add(keyLight);
const cyanLight = new THREE.PointLight(COLORS.cyan,22,38,2); cyanLight.position.set(-7,7,-6); scene.add(cyanLight);

const root = new THREE.Group(); root.rotation.y=-0.10; scene.add(root);
const unitX = grid.cellSize[0]*0.91, unitZ = grid.cellSize[1]*0.91;
const cellBox = new THREE.BoxGeometry(unitX,1,unitZ);
const tileBox = new THREE.BoxGeometry(unitX,0.045,unitZ);
const matrix = new THREE.Matrix4();
const dummy = new THREE.Object3D();

function material(color,opacity=1,emissive=0){return new THREE.MeshStandardMaterial({color,roughness:.74,metalness:.04,transparent:true,opacity,depthWrite:opacity>.75,emissive,emissiveIntensity:emissive?0.22:0});}
function buildPoints(field,color,size){
  const positions=new Float32Array(grid.cells.length*3);
  grid.cells.forEach((c,i)=>{positions[i*3]=c[0];positions[i*3+1]=c[field];positions[i*3+2]=c[1];});
  const geometry=new THREE.BufferGeometry();geometry.setAttribute("position",new THREE.BufferAttribute(positions,3));
  return new THREE.Points(geometry,new THREE.PointsMaterial({color,size,transparent:true,opacity:0,sizeAttenuation:true,depthWrite:false}));
}
function buildSurface(field,color,opacity){
  const mesh=new THREE.InstancedMesh(tileBox,material(color,opacity),grid.cells.length);
  grid.cells.forEach((c,i)=>{dummy.position.set(c[0],c[field],c[1]);dummy.scale.set(1,1,1);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);});
  mesh.instanceMatrix.needsUpdate=true;return mesh;
}
function buildColumns(kind,color,filter=()=>true){
  const cells=grid.cells.filter(filter);const mesh=new THREE.InstancedMesh(cellBox,material(color,0),cells.length);
  cells.forEach((c,i)=>{let y,h;if(kind==="total"){h=Math.max(.02,c[2]-c[3]);y=c[3]+h/2;}else if(kind==="soil"){h=Math.max(.02,c[5]);y=c[2]-h/2;}else{h=Math.max(.02,c[6]);y=c[3]+h/2;}dummy.position.set(c[0],y,c[1]);dummy.scale.set(1,h,1);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);});
  mesh.instanceMatrix.needsUpdate=true;return mesh;
}

const groundPoints=buildPoints(2,COLORS.surface,.075), bedrockPoints=buildPoints(4,COLORS.cyan,.07), designPoints=buildPoints(3,COLORS.amber,.072);
const groundSurface=buildSurface(2,COLORS.surface,0), bedrockSurface=buildSurface(4,COLORS.cyan,0), designSurface=buildSurface(3,COLORS.amber,0);
const totalVolume=buildColumns("total",COLORS.orange), soilVolume=buildColumns("soil",COLORS.soil), rockVolume=buildColumns("rock",COLORS.rock);
const regionColors=[0xff7043,0x48b8c9,0xd6bc54];
const regions=regionColors.map((color,region)=>buildColumns("total",color,c=>c[7]===region));
const modelObjects=[groundPoints,bedrockPoints,designPoints,groundSurface,bedrockSurface,designSurface,totalVolume,soilVolume,rockVolume,...regions];modelObjects.forEach(o=>root.add(o));

const boundaryCells=[];const occupancy=new Set(grid.cells.map(c=>`${Math.round((c[0]/28+.5)*(grid.cols-1))},${Math.round((c[1]/11.2+.5)*(grid.rows-1))}`));
grid.cells.forEach(c=>{const gx=Math.round((c[0]/28+.5)*(grid.cols-1)),gz=Math.round((c[1]/11.2+.5)*(grid.rows-1));if([[1,0],[-1,0],[0,1],[0,-1]].some(([dx,dz])=>!occupancy.has(`${gx+dx},${gz+dz}`)))boundaryCells.push(c);});
const boundaryGeo=new THREE.BufferGeometry();boundaryGeo.setAttribute("position",new THREE.Float32BufferAttribute(boundaryCells.flatMap(c=>[c[0],.18,c[1]]),3));
const boundary=new THREE.Points(boundaryGeo,new THREE.PointsMaterial({color:COLORS.orange,size:.11,transparent:true,opacity:1,depthWrite:false}));root.add(boundary);

const sliceCells=grid.cells.filter(c=>Math.abs(c[1])<.18);
const sliceSoil=buildColumns("soil",0xe57f59,c=>Math.abs(c[1])<.18), sliceRock=buildColumns("rock",0xa3aca7,c=>Math.abs(c[1])<.18);root.add(sliceSoil,sliceRock);

const gridHelper=new THREE.GridHelper(48,48,0x314039,0x1b2621);gridHelper.position.y=-.6;gridHelper.material.transparent=true;gridHelper.material.opacity=.22;scene.add(gridHelper);

function setOpacity(object,value){object.visible=value>.002;if(object.material){object.material.opacity=value;object.material.transparent=true;object.material.depthWrite=value>.72;}}
function clamp(v,a=0,b=1){return Math.max(a,Math.min(b,v));}
function smooth(v){v=clamp(v);return v*v*(3-2*v);}
function phase(t,a,b){return smooth((t-a)/(b-a));}
function fadeRange(t,a,b,c,d){return phase(t,a,b)*(1-phase(t,c,d));}
function lerp(a,b,t){return a+(b-a)*t;}
function fmt(value){return Math.round(value).toLocaleString("zh-CN");}
function sourceTime(t){
  for(let i=1;i<TIME_MAP.length;i++)if(t<=TIME_MAP[i][0]){const [ta,ua]=TIME_MAP[i-1],[tb,ub]=TIME_MAP[i];return lerp(ua,ub,(t-ta)/(tb-ta));}
  return 94;
}

let currentTime=0,playing=!matchMedia("(prefers-reduced-motion: reduce)").matches,lastTick=null,activeChapter=-1,dragYaw=0,dragPitch=0,zoomOffset=0,dragging=false,lastPointer=null;
const chapterTitle=$("#chapterTitle"),chapterDescription=$("#chapterDescription"),chapterIndex=$("#chapterIndex"),playerChapter=$("#playerChapter"),relationText=$("#relationText");
const scrubber=$("#scrubber"),currentTimeEl=$("#currentTime"),playIcon=$("#playIcon"),playBtn=$("#playBtn"),sectionPanel=$("#sectionPanel"),resultsPanel=$("#resultsPanel"),finalTotal=$("#finalTotal");

function chapterFor(t){for(let i=CHAPTERS.length-1;i>=0;i--)if(t>=CHAPTERS[i].start)return i;return 0;}
function updateChapter(index){
  activeChapter=index;const chapter=CHAPTERS[index];chapterTitle.textContent=chapter.title;chapterDescription.textContent=chapter.desc;chapterIndex.textContent=`${String(index).padStart(2,"0")} / 05`;playerChapter.textContent=chapter.short;
  document.querySelectorAll(".chapter-btn").forEach((button,i)=>button.classList.toggle("active",i===index));
}
function updatePlayIcon(){playIcon.className=`icon ${playing?"pause-icon":"play-icon"}`;playBtn.setAttribute("aria-label",playing?"暂停":"播放");}
function updateCamera(t){
  const index=chapterFor(t),chapter=CHAPTERS[index],next=CHAPTERS[Math.min(index+1,CHAPTERS.length-1)];const p=phase(t,chapter.end-1.4,chapter.end);
  const pos=chapter.camera.map((v,i)=>lerp(v,next.camera[i],p));
  const base=new THREE.Vector3(...pos);const target=new THREE.Vector3(0,1.25,0);base.sub(target);base.applyAxisAngle(new THREE.Vector3(0,1,0),dragYaw);base.y+=dragPitch*7;base.multiplyScalar(1+zoomOffset);camera.position.copy(target).add(base);camera.lookAt(target);
}
function renderState(t){
  const u=sourceTime(t);
  const intro=phase(u,0,3),pointStage=fadeRange(u,7.5,9,33,36),surfaceStage=phase(u,22,28),designStage=phase(u,35,40),totalStage=fadeRange(u,47,52,64,67),splitStage=phase(u,62,68),resultStage=phase(u,76,79);
  setOpacity(boundary,Math.max(.25,intro));
  setOpacity(groundPoints,pointStage*(1-.72*surfaceStage));setOpacity(bedrockPoints,phase(u,12,15)*(1-phase(u,31,35))*.92);setOpacity(designPoints,phase(u,17,20)*(1-phase(u,39,42))*.95);
  setOpacity(groundSurface,surfaceStage*(1-.45*splitStage));setOpacity(bedrockSurface,phase(u,27,32)*(.52+.28*splitStage));setOpacity(designSurface,designStage*(1-.32*splitStage));
  groundSurface.position.y=lerp(.9,0,phase(u,38,43));designSurface.position.y=lerp(-.75,0,phase(u,38,43));
  setOpacity(totalVolume,totalStage*.58);setOpacity(soilVolume,splitStage*.74);setOpacity(rockVolume,splitStage*.78);
  soilVolume.position.y=lerp(0,.52,phase(u,68,72));rockVolume.position.y=lerp(0,-.34,phase(u,68,72));
  setOpacity(sliceSoil,fadeRange(u,62,66,76,78));setOpacity(sliceRock,fadeRange(u,62,66,76,78));sliceSoil.position.z=.5;sliceRock.position.z=.5;
  regions.forEach(r=>setOpacity(r,0));
  sectionPanel.style.opacity=String(fadeRange(u,60,64,76,78));resultsPanel.style.opacity=String(resultStage);finalTotal.style.opacity="0";
  relationText.style.opacity=String(fadeRange(u,48,51,76,78));
  if(u<63)relationText.textContent="V挖 = Σ [ Zground − Zdesign ] × 网格面积";else if(u<68)relationText.textContent="Zrock ≤ Zdesign：未挖到岩层，整柱计土";else if(u<73)relationText.textContent="Zdesign < Zrock < Zground：交线以上土、以下岩";else relationText.textContent="Zrock ≥ Zground：开挖柱体全部计岩";
  const caseLabel=$("#caseLabel");caseLabel.textContent=u<68?"CASE 01 / 未挖到岩层":u<73?"CASE 02 / 基岩面穿过开挖体":"CASE 03 / 开挖体全部为岩";
  document.querySelectorAll(".data-callout").forEach(el=>{const start=Number(el.dataset.start),end=Number(el.dataset.end);el.style.opacity=String(fadeRange(u,start,start+.7,end,end+.7));});
  document.querySelectorAll(".input-row").forEach((row,i)=>row.classList.toggle("active",u>=[8,9,12,17][i]));
  const resultProgress=phase(u,77,79);document.querySelectorAll("[data-value]").forEach(el=>{const value=Number(el.dataset.value)*resultProgress;el.textContent=Number(el.dataset.decimals)===5?value.toFixed(5):value.toLocaleString("zh-CN",{minimumFractionDigits:2,maximumFractionDigits:2});});
  root.rotation.y=-.10+.18*Math.sin(u*.075);updateCamera(t);
  scrubber.value=String(t);currentTimeEl.textContent=`${String(Math.floor(t/60)).padStart(2,"0")}:${String(Math.floor(t%60)).padStart(2,"0")}`;
  const index=chapterFor(t);if(index!==activeChapter)updateChapter(index);
  renderer.render(scene,camera);
}

function seek(value){currentTime=clamp(Number(value),0,DURATION);lastTick=null;renderState(currentTime);}
window.__seek=seek;
function tick(now){
  if(lastTick===null){lastTick=now;window.__ready=true;renderState(currentTime);requestAnimationFrame(tick);return;}
  const dt=(now-lastTick)/1000;lastTick=now;if(playing){currentTime+=dt;if(currentTime>=DURATION){currentTime=window.__recording?DURATION-.001:0;if(window.__recording)playing=false;}renderState(currentTime);}requestAnimationFrame(tick);
}

function buildUI(){
  const nav=$("#chapterNav");CHAPTERS.forEach((chapter,index)=>{const button=document.createElement("button");button.type="button";button.className="chapter-btn";button.innerHTML=`<b>${String(index).padStart(2,"0")}</b><span>${chapter.short}</span>`;button.addEventListener("click",()=>{seek(chapter.start);playing=true;updatePlayIcon();});nav.appendChild(button);});
  const rows=$("#resultRows");RESULTS.forEach((row,index)=>{const element=document.createElement("div");element.className=`result-row compare-row row-${index}`;element.innerHTML=`<strong>${row[0]}</strong><b data-value="${row[1]}">0.00</b><b data-value="${row[2]}">0.00</b><b class="${row[3]<0?"negative":"positive"}" data-value="${row[3]}">0.00</b><b>${row[4]===null?"—":`<span data-value="${row[4]}" data-decimals="5">0.00000</span>`}</b>`;rows.appendChild(element);});
  const sorted=[...sliceCells].sort((a,b)=>a[0]-b[0]);const minX=Math.min(...sorted.map(c=>c[0])),maxX=Math.max(...sorted.map(c=>c[0]));const mapX=x=>18+(x-minX)/(maxX-minX)*604,mapY=y=>145-(y+.2)/4.8*125;const line=field=>sorted.map((c,i)=>`${i?"L":"M"}${mapX(c[0]).toFixed(1)},${mapY(c[field]).toFixed(1)}`).join(" ");const ground=line(2),design=line(3),bedrock=line(4);$("#groundLine").setAttribute("d",ground);$("#designLine").setAttribute("d",design);$("#bedrockLine").setAttribute("d",bedrock);$("#soilFill").setAttribute("d",`${ground} ${[...sorted].reverse().map(c=>`L${mapX(c[0]).toFixed(1)},${mapY(Math.max(c[3],Math.min(c[4],c[2]))).toFixed(1)}`).join(" ")} Z`);$("#rockFill").setAttribute("d",`${bedrock} ${[...sorted].reverse().map(c=>`L${mapX(c[0]).toFixed(1)},${mapY(c[3]).toFixed(1)}`).join(" ")} Z`);
}
function resize(){const rect=app.getBoundingClientRect();renderer.setSize(rect.width,rect.height,false);camera.aspect=rect.width/rect.height;camera.updateProjectionMatrix();renderState(currentTime);}

$("#playBtn").addEventListener("click",()=>{playing=!playing;lastTick=null;updatePlayIcon();});
$("#prevBtn").addEventListener("click",()=>{const i=Math.max(0,chapterFor(currentTime-.2)-1);seek(CHAPTERS[i].start);});
$("#nextBtn").addEventListener("click",()=>{const i=Math.min(CHAPTERS.length-1,chapterFor(currentTime)+1);seek(CHAPTERS[i].start);});
$("#resetBtn").addEventListener("click",()=>{dragYaw=0;dragPitch=0;zoomOffset=0;seek(0);playing=true;updatePlayIcon();});
scrubber.addEventListener("input",event=>{playing=false;updatePlayIcon();seek(event.target.value);});
canvas.addEventListener("pointerdown",event=>{dragging=true;lastPointer=[event.clientX,event.clientY];canvas.setPointerCapture(event.pointerId);});
canvas.addEventListener("pointermove",event=>{if(!dragging)return;dragYaw+=(event.clientX-lastPointer[0])*.004;dragPitch=clamp(dragPitch+(event.clientY-lastPointer[1])*.002,-.45,.45);lastPointer=[event.clientX,event.clientY];renderState(currentTime);});
canvas.addEventListener("pointerup",()=>{dragging=false;lastPointer=null;});
canvas.addEventListener("wheel",event=>{event.preventDefault();zoomOffset=clamp(zoomOffset+Math.sign(event.deltaY)*.06,-.28,.42);renderState(currentTime);},{passive:false});
addEventListener("resize",resize);
buildUI();resize();updatePlayIcon();document.fonts.ready.then(()=>requestAnimationFrame(tick));
