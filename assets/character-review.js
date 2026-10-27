import { U as Scene, F as PerspectiveCamera, o as WebGLRenderer, w as HemisphereLight, _ as DirectionalLight, A as Mesh, g as CylinderGeometry, N as MeshStandardMaterial, m as Color } from './three-AKSjQ_ch.js';
import { loadCharacterLibrary, createCharacter } from './characters.js';

const characters = [
  ['player','調查員 008','循線尋找答案的人','卡其草帽、苔綠襯衫與側背資料袋。保留調查員的身分，補上衣領、鞋履與面部細節。','延續遊戲原本角色，以書中小鎮的年代感重新設計。','ill-2-K9VBww_N.jpg'],
  ['chen','陳拱北教授','從證據出發','側分短髮、濃眉與深藍蝴蝶結領帶。白袍下的沉穩神情，呼應帶領調查的研究者。','參考第 4、10 頁插圖及第 33 頁標名照片。','ill-3-D4CW0XM1.jpg'],
  ['templekeeper','廟公','村落的守望者','灰髮、米赭色上衣與深灰寬褲。保留鄉間長者的樸實輪廓，讓眉眼與衣襟更清楚。','取材自廟埕群像與遊戲既有身分，屬造型詮釋。','ill-2-K9VBww_N.jpg'],
  ['saltfarmer','鹽農','鹽田裡的日常','寬邊竹笠、頸邊汗巾、淺色工作衣與捲起的褲管。曬暖的膚色，記錄戶外勞動的生活。','參考鹽田與井邊勞動者的服裝元素。','page-09-BTw3yxOq.jpg'],
  ['labassistant','化驗助理','把線索留下來','黑框眼鏡與淡藍白袍，搭配領帶和記錄板。瘦長身形與細節，區別於陳教授。','參考第 10 頁研究人員；與遊戲角色的對應為詮釋。','ill-3-D4CW0XM1.jpg'],
  ['wang','王金河醫師','診間裡的陪伴','側分黑髮、黑色矩形眼鏡、白醫師袍與深色領帶。進入診所後，他會俯身照顧病人的腿腳。','參考第 14、33 頁與助人插圖，重製溫和而專注的形象。','ill-5-BmG5ITOP.jpg'],
  ['sun','孫理蓮女士','把憐憫之門打開','灰褐波浪短髮、深靛藍洋裝與柔和臉型。以穩重的姿態，呈現長年投入照顧的形象。','參考第 33 頁標名照片，保留簡潔衣領與洋裝輪廓。','page-33-DKZv5Eiw.jpg'],
  ['mao','毛碧梅女士','手藝，也是一份希望','深灰盤髮、粉紫上衣與灰綠裙，搭配編織手袋。服裝取材自手工藝場景的柔和色彩。','第 16 頁圖中未逐一標名，人物外觀為場景啟發的詮釋。','page-16-m8-yb6_s.jpg'],
  ['engineer','工程人員','讓乾淨的水抵達村落','卡其工作帽、短袖襯衫、軍綠長褲與棕靴，帶著工作圖紙。方正輪廓呼應戶外工程工作。','延續遊戲身分與自來水工程場景，屬造型詮釋。','page-17-36jStZKJ.jpg'],
  ['baoyu','寶玉','記得跳格子的日子','偏分短黑髮、薄荷色翻領上衣與靛藍褲。以安靜坐姿、自然手勢與清潔包紮呈現。','依第 13 頁左側較年長的女孩設計。','page-13-CIMUQZEC.jpg'],
  ['quance','泉策','和姐姐一起等待明天','黑色鮑伯短髮、紅髮帶與磚紅上衣。身形較小，坐姿和配色都與寶玉明確區分。','依第 13 頁右側較年幼的女孩設計。','page-13-CIMUQZEC.jpg'],
  ['clinicPatient','診所病人','被好好對待的鄉親','稀薄灰髮、淡色上衣與乾淨腿部包紮。診所內有座椅與支腳凳，讓看診動作自然地發生。','參考第 2 頁長者，新增為診所看診情境人物。','ill-1-CMGtWHPR.jpg']
];
const canvas = document.querySelector('#character-canvas');
const scene = new Scene(); scene.background = new Color('#e9ede3');
const camera = new PerspectiveCamera(32, 1, 0.05, 50);
const renderer = new WebGLRenderer({ canvas, antialias: true, powerPreference: 'low-power' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5)); renderer.toneMapping = 4; renderer.toneMappingExposure = 1.18;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = 1;
scene.add(new HemisphereLight(0xffffff, 0x8a9a7c, 2.2));
const key = new DirectionalLight(0xfff3df, 3.1); key.position.set(-3, 5, 4); key.castShadow = true;
key.shadow.mapSize.set(1024,1024); key.shadow.camera.left=-2; key.shadow.camera.right=2; key.shadow.camera.top=3; key.shadow.camera.bottom=-2; key.shadow.bias=-0.0004; scene.add(key);
const rim = new DirectionalLight(0xe5edff, 1.2); rim.position.set(3, 3, -3); scene.add(rim);
const pedestal = new Mesh(new CylinderGeometry(0.72,0.76,0.07,64), new MeshStandardMaterial({color:0xd4dbc9,roughness:1}));
pedestal.position.y=-0.055; pedestal.receiveShadow=true; scene.add(pedestal);
let model, selected='wang', angle=0, zoom=4.4, spinning=false, frame=0, lastTime=0;
function render(){renderer.render(scene,camera);}
function resize(){const r=canvas.getBoundingClientRect();renderer.setSize(r.width,r.height,false);camera.aspect=r.width/r.height;camera.updateProjectionMatrix();frameCamera();}
function frameCamera(){camera.position.set(Math.sin(angle)*zoom,1.27,Math.cos(angle)*zoom);camera.lookAt(0,0.94,0);render();}
function spin(time){if(!spinning||document.hidden){frame=0;lastTime=0;return;}if(lastTime)angle+=(time-lastTime)*0.00024;lastTime=time;frameCamera();frame=requestAnimationFrame(spin);}
function select(id){
  const entry=characters.find(row=>row[0]===id); if(model)scene.remove(model);
  model=createCharacter(id); scene.add(model); selected=id; angle=0.16;
  const number=characters.indexOf(entry)+1;
  document.querySelector('#character-number').textContent=String(number).padStart(2,'0')+' / 12';
  document.querySelector('#character-role').textContent=entry[2];document.querySelector('#character-name').textContent=entry[1];
  document.querySelector('#character-description').textContent=entry[3];document.querySelector('#character-reference').textContent=entry[4];
  document.querySelector('#book-image').src='./assets/'+entry[5];document.querySelector('#book-link').href='./assets/'+entry[5];
  document.querySelector('#model-download').href='./assets/characters/'+id+'.glb';
  for(const b of document.querySelectorAll('.roster button'))b.setAttribute('aria-pressed',String(b.dataset.id===id));
  frameCamera();
}
const roster=document.querySelector('#roster');
for(const [index,row] of characters.entries()){const b=document.createElement('button');b.dataset.id=row[0];b.setAttribute('aria-pressed','false');b.innerHTML='<span class="index">'+String(index+1).padStart(2,'0')+'</span><span>'+row[1]+'</span>';b.onclick=()=>select(row[0]);roster.append(b);}
document.querySelector('#front').onclick=()=>{angle=0;frameCamera();};document.querySelector('#back').onclick=()=>{angle=Math.PI;frameCamera();};
document.querySelector('#rotate').onclick=e=>{spinning=!spinning;e.currentTarget.setAttribute('aria-pressed',String(spinning));if(spinning&&!frame)frame=requestAnimationFrame(spin);};
let pointer=null,lastX=0;canvas.addEventListener('pointerdown',e=>{pointer=e.pointerId;lastX=e.clientX;canvas.setPointerCapture(pointer);});
canvas.addEventListener('pointermove',e=>{if(e.pointerId!==pointer)return;angle-=(e.clientX-lastX)*0.012;lastX=e.clientX;frameCamera();});
for(const name of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(name,()=>pointer=null);
canvas.addEventListener('wheel',e=>{e.preventDefault();zoom=Math.min(6.2,Math.max(2.7,zoom+e.deltaY*0.002));frameCamera();},{passive:false});
canvas.addEventListener('keydown',e=>{if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();angle+=(e.key==='ArrowLeft'?-1:1)*0.25;frameCamera();}});
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&spinning&&!frame)frame=requestAnimationFrame(spin);});
new ResizeObserver(resize).observe(canvas);
try{await loadCharacterLibrary();select(selected);document.querySelector('#loading').remove();resize();}catch(error){document.querySelector('#loading').textContent=error.message;console.error(error);}
