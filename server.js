const http=require('http'),fs=require('fs'),path=require('path'),crypto=require('crypto');
const ROOT=__dirname,DATA=path.join(ROOT,'data','site.json');
const defaults={settings:{brand:'鑫海传媒',eyebrow:'数字内容 · 娱乐直播 · 艺人孵化',headline:'无限热爱 · 无限可能',subtitle:'让每一种热爱，都有闪耀的舞台',description:'我们是一家专注数字内容创作、直播运营与人才孵化的创新传媒机构。通过专业空间、创意团队和成长体系，陪伴每一位创作者探索更多可能。',phone:'400-000-0000',address:'示例地址 · 请在后台修改',email:'hello@example.com',accent:'#d9b77c',heroImage:'',aboutImage:'',aboutTagline:'以内容为核心，以创意为驱动。我们相信，每一个闪光的想法，都值得被认真看见。',footerTagline:'INFINITE PASSION · INFINITE POSSIBILITY',copyright:'鑫海传媒 · 示例网站，内容均为占位信息',businessHeading:'核心业务',businessIntro:'以专业与热爱，创造更多可能',galleryHeading:'团队与空间',galleryIntro:'让创意自由发生的地方',jobsHeading:'开放职位',jobsIntro:'选择适合你的舞台',contactHeading:'联系我们',contactIntro:'期待与你一起，开启下一个精彩故事。'},stats:[{id:1,value:'5000',unit:'㎡',label:'创意空间'},{id:2,value:'20',unit:'+',label:'专业场景'},{id:3,value:'60',unit:'+',label:'团队伙伴'},{id:4,value:'100',unit:'+',label:'成长创作者'}],businesses:[{id:1,title:'直播内容孵化',desc:'从内容定位、场景搭建到运营增长，提供一站式直播解决方案。',icon:'✦'},{id:2,title:'艺人经纪培养',desc:'系统化培训与成长陪伴，打造多元化创作者矩阵。',icon:'✧'},{id:3,title:'品牌内容营销',desc:'融合创意策划、视频制作与传播运营，释放品牌价值。',icon:'◈'}],jobs:[{id:1,title:'娱乐主播',type:'全职 / 兼职',salary:'薪资面议',desc:'热爱镜头表达，有责任心；经验不限，提供系统培训。'},{id:2,title:'直播运营',type:'全职',salary:'薪资面议',desc:'负责直播策划、数据分析与主播成长支持。'},{id:3,title:'短视频编导',type:'全职',salary:'薪资面议',desc:'负责选题策划、拍摄脚本和内容制作。'}],gallery:[{id:1,title:'创意办公空间',image:'',alt:'创意办公空间'},{id:2,title:'专业直播空间',image:'',alt:'专业直播空间'},{id:3,title:'团队协作现场',image:'',alt:'团队协作现场'}],messages:[],applications:[]};
if(!fs.existsSync(DATA)){fs.mkdirSync(path.dirname(DATA),{recursive:true});fs.writeFileSync(DATA,JSON.stringify(defaults,null,2))}
let db=JSON.parse(fs.readFileSync(DATA,'utf8'));for(const k of ['settings','stats','businesses','jobs','gallery','messages','applications'])if(db[k]===undefined)db[k]=JSON.parse(JSON.stringify(defaults[k]));for(const [k,v] of Object.entries(defaults.settings))if(db.settings[k]===undefined)db.settings[k]=v;
let sessions=new Map();const secret=process.env.ADMIN_PASSWORD;if(!secret)console.warn('ADMIN_PASSWORD 未设置，后台登录不可用');
function save(next=db) {
  const temporary = DATA + '.tmp';
  fs.writeFileSync(temporary, JSON.stringify(next, null, 2));
  fs.renameSync(temporary, DATA);
  db = next;
}
function send(res,status,obj){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(obj))}
const MAX_BODY = 16 * 1024 * 1024;
async function parse(req, limit=3000000) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size <= limit) chunks.push(chunk);
  }
  if (size > limit) throw Object.assign(Error('请求过大，请压缩图片后重试'), {status:413});
  return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
}
function auth(req){const t=(req.headers.authorization||'').replace(/^Bearer /,'');return sessions.has(t)&&sessions.get(t)>Date.now()}
const rateMap=new Map();function rate(req){const ip=req.socket.remoteAddress||'unknown',now=Date.now(),r=(rateMap.get(ip)||[]).filter(t=>now-t<60000);r.push(now);rateMap.set(ip,r);return r.length<=30}
const clean=(x,n=1000)=>String(x??'').trim().slice(0,n),isScene=x=>/^scenes\/[a-z0-9-]+\.(?:webp|jpg)$/.test(x),isImage=x=>!x||(typeof x==='string'&&(x==='/xinhai-media-hero.svg'||(isScene(x.slice(1))&&x.startsWith('/')&&fs.existsSync(path.join(ROOT,'public',x.slice(1))))||(/^https:\/\//i.test(x)&&x.length<2000)||(/^data:image\/(png|jpeg|webp|gif);base64,/i.test(x)&&x.length<2500000)));
const publicData=()=>({settings:db.settings,stats:db.stats,businesses:db.businesses,jobs:db.jobs,gallery:db.gallery});
const server=http.createServer(async(req,res)=>{const url=new URL(req.url,'http://localhost');try{
if(url.pathname==='/api/site'&&req.method==='GET')return send(res,200,publicData());
if(url.pathname==='/api/login'&&req.method==='POST'){if(!rate(req))return send(res,429,{error:'请求过于频繁'});const b=await parse(req),a=crypto.createHash('sha256').update(clean(b.password,200)).digest(),z=crypto.createHash('sha256').update(secret||'').digest();if(!secret||!crypto.timingSafeEqual(a,z)||b.username!=='admin')return send(res,401,{error:'账号或密码错误'});const token=crypto.randomBytes(32).toString('hex');sessions.set(token,Date.now()+8*3600000);return send(res,200,{token})}
if(url.pathname==='/api/contact'&&req.method==='POST'){if(!rate(req))return send(res,429,{error:'提交太频繁'});const b=await parse(req),name=clean(b.name,60),phone=clean(b.phone,40);if(!name||!phone)return send(res,400,{error:'请填写姓名和联系方式'});db.messages.unshift({id:crypto.randomUUID(),name,phone,interest:clean(b.interest,100),message:clean(b.message,1000),createdAt:new Date().toISOString()});save();return send(res,201,{ok:true})}
if(url.pathname==='/api/apply'&&req.method==='POST'){if(!rate(req))return send(res,429,{error:'提交太频繁'});const b=await parse(req),name=clean(b.name,60),phone=clean(b.phone,40),jobId=Number(b.jobId);if(!name||!phone||!db.jobs.some(j=>j.id===jobId))return send(res,400,{error:'请填写完整申请信息'});db.applications.unshift({id:crypto.randomUUID(),name,phone,jobId,intro:clean(b.intro,1000),createdAt:new Date().toISOString()});save();return send(res,201,{ok:true})}
if(url.pathname.startsWith('/api/admin/')){if(!auth(req))return send(res,401,{error:'请先登录'});if(url.pathname==='/api/admin/data'&&req.method==='GET')return send(res,200,db);if(url.pathname==='/api/admin/save'&&req.method==='PUT'){const b = await parse(req, MAX_BODY);
const next = {...db, settings:{...db.settings}};
for (const key of ['stats', 'businesses', 'jobs', 'gallery']) {
  if (!(key in b)) continue;
  if (!Array.isArray(b[key]) || b[key].length > 100 || b[key].some(item => !item || typeof item !== 'object')) {
    return send(res,400,{error:'数据格式不正确'});
  }
  if (key === 'gallery' && b[key].some(item => !isImage(item.image))) {
    return send(res,400,{error:'请使用有效的站内图片、HTTPS 地址或上传图片'});
  }
  next[key] = b[key].map((item,index) => ({...item,id:Number(item.id)||Date.now()+index}));
}
if (b.settings && typeof b.settings === 'object') {
  for (const key of Object.keys(defaults.settings)) {
    if (!(key in b.settings)) continue;
    const imageField = ['heroImage', 'aboutImage'].includes(key);
    if (imageField && !isImage(b.settings[key])) {
      return send(res,400,{error:'请使用有效的站内图片、HTTPS 地址或上传图片'});
    }
    next.settings[key] = clean(b.settings[key], imageField ? 2500000 : 3000);
  }
}
save(next);
return send(res,200,{ok:true});
}if(url.pathname==='/api/admin/delete'&&req.method==='POST'){const b=await parse(req);if(!['messages','applications'].includes(b.collection))return send(res,400,{error:'无效分类'});db[b.collection]=db[b.collection].filter(x=>x.id!==b.id);save();return send(res,200,{ok:true})}}
if(req.method!=='GET')return send(res,404,{error:'未找到接口'});let file=url.pathname==='/'?'index.html':decodeURIComponent(url.pathname.slice(1));if(!['index.html','admin.html','style.css','app.js','admin.js','xinhai-media-hero.svg'].includes(file)&&!isScene(file))return send(res,404,{error:'文件不存在'});const asset=path.join(ROOT,'public',file);if(!fs.existsSync(asset))return send(res,404,{error:'文件不存在'});const ext=path.extname(file),types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.svg':'image/svg+xml','.webp':'image/webp','.jpg':'image/jpeg'};res.writeHead(200,{'Content-Type':types[ext]});fs.createReadStream(asset).pipe(res)
}catch(e){send(res,e.status||400,{error:e.status?e.message:'请求处理失败'})}});server.listen(process.env.PORT||3000,()=>console.log('网站运行于 http://localhost:'+(process.env.PORT||3000)));