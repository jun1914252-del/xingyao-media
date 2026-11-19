const $=s=>document.querySelector(s),names={overview:'数据概览',settings:'全站文案与图片',stats:'首页统计数据',businesses:'核心业务管理',gallery:'图片素材管理',jobs:'招聘岗位管理',applications:'简历投递',messages:'访客留言'};let token=sessionStorage.getItem('adminToken')||'',db,tab='overview';
const e=(tag,txt,cls)=>{const x=document.createElement(tag);if(txt!==undefined)x.textContent=txt;if(cls)x.className=cls;return x};
async function api(url,method='GET',body){const r=await fetch(url,{method,headers:{'Content-Type':'application/json',Authorization:'Bearer '+token},body:body?JSON.stringify(body):undefined});const d=await r.json();if(!r.ok)throw Error(d.error||'操作失败');return d}
function input(parent,label,value,cb,multi=false){const wrap=e('div',undefined,'field'),l=e('label',label),x=e(multi?'textarea':'input');x.value=value??'';if(!multi)x.type='text';x.oninput=()=>cb(x.value);wrap.append(l,x);parent.append(wrap)}
function btn(parent,label,callback,cls='btn primary'){const b=e('button',label,cls);b.type='button';b.onclick=callback;parent.append(b);return b}
async function save(key){try{await api('/api/admin/save','PUT',{[key]:db[key]});$('#saveStatus').textContent='保存成功，网站刷新后即可看到最新内容'}catch(err){$('#saveStatus').textContent=err.message}}
function imageField(parent, label, item, key) {
  const wrap = e('div', undefined, 'field image-upload');
  const preview = e('img', undefined, 'image-preview');
  preview.alt = label + '预览';
  const status = e('p', '', 'form-status');
  status.setAttribute('role', 'status');
  function previewImage() {
    preview.hidden = !item[key];
    status.textContent = '';
    if (item[key]) preview.src = item[key];
    else preview.removeAttribute('src');
  }
  preview.onerror = () => {
    preview.hidden = true;
    status.textContent = '无法预览，请检查图片地址或文件。';
  };
  const address = e('input');
  address.type = 'text';
  address.value = /^data:/i.test(item[key] || '') ? '' : item[key] || '';
  address.placeholder = 'https://…';
  address.oninput = () => {
    item[key] = address.value.trim();
    previewImage();
  };
  const addressLabel = e('label', label + '地址');
  addressLabel.append(address);
  const file = e('input');
  file.type = 'file';
  file.accept = 'image/png,image/jpeg,image/webp,image/gif';
  file.onchange = () => {
    const selected = file.files[0];
    if (!selected) return;
    if (!/^image\/(png|jpeg|webp|gif)$/.test(selected.type) || selected.size > 1.5 * 1024 * 1024) {
      status.textContent = '请选择 1.5 MB 以内的 PNG、JPG、WebP 或 GIF 图片。';
      file.value = '';
      return;
    }
    const previous = item[key];
    const reader = new FileReader();
    reader.onerror = () => { status.textContent = '读取图片失败，请重试。'; };
    reader.onload = () => {
      if (item[key] !== previous) return;
      const image = new Image();
      image.onerror = () => { status.textContent = '图片无法读取，请选择其他文件。'; };
      image.onload = () => {
        if (item[key] !== previous) return;
        item[key] = reader.result;
        address.value = '';
        previewImage();
      };
      image.src = reader.result;
    };
    reader.readAsDataURL(selected);
  };
  const fileLabel = e('label', '选择或替换图片');
  fileLabel.append(file);
  wrap.append(addressLabel, fileLabel, preview, status);
  btn(wrap, '清除图片', () => {
    item[key] = '';
    address.value = file.value = '';
    previewImage();
  }, 'danger');
  parent.append(wrap);
  previewImage();
}

function editList(parent, key, fields) {
  const items = db[key];
  items.forEach((item, index) => {
    const card = e('div', undefined, 'editable');
    card.append(e('h3', item.title || '项目 ' + (index + 1)));
    fields.forEach(([field, label, multi]) => input(card, label, item[field], value => item[field] = value, !!multi));
    const actions = e('div', undefined, 'image-actions');
    if (key === 'gallery') {
      imageField(card, '场景图片', item, 'image');
      for (const [label, offset] of [['上移', -1], ['下移', 1]]) {
        const destination = index + offset;
        btn(actions, label, () => {
          [items[index], items[destination]] = [items[destination], items[index]];
          show(key);
        }, 'danger').disabled = destination < 0 || destination >= items.length;
      }
    }
    btn(actions, '删除此项', () => { items.splice(index, 1); show(key); }, 'danger');
    card.append(actions);
    parent.append(card);
  });
  btn(parent, '＋ 添加项目', () => {
    items.push({id: Date.now(), ...Object.fromEntries(fields.map(([key]) => [key, '']))});
    show(key);
  }, 'btn outline');
  btn(parent, '保存全部更改', () => save(key));
}
function show(t){tab=t;$('#panelTitle').textContent=names[t];$('#saveStatus').textContent='';document.querySelectorAll('[data-tab]').forEach(b=>b.classList.toggle('active',b.dataset.tab===t));const p=$('#panelBody');p.replaceChildren();
if(t==='overview'){const counts=e('div',undefined,'admin-counts');[['简历投递',db.applications.length],['访客留言',db.messages.length],['开放职位',db.jobs.length],['业务项目',db.businesses.length],['展示图片',db.gallery.length]].forEach(([n,v])=>{const c=e('div');c.append(e('strong',v),e('span',n));counts.append(c)});p.append(counts,e('p','网站内容、图片和统计数据均可在左侧栏目编辑。','muted'));return}
if(t==='settings'){const labels={brand:['品牌名称'],eyebrow:['首页顶部标签'],headline:['首页主标题'],subtitle:['首页副标题'],description:['公司介绍',true],aboutTagline:['关于我们补充文案',true],heroImage:['首页主视觉图片 URL（HTTPS）'],aboutImage:['公司介绍背景图片 URL（HTTPS）'],businessHeading:['业务栏目标题'],businessIntro:['业务栏目副标题'],galleryHeading:['展示栏目标题'],galleryIntro:['展示栏目副标题'],jobsHeading:['招聘栏目标题'],jobsIntro:['招聘栏目副标题'],contactHeading:['联系栏目标题'],contactIntro:['联系栏目介绍',true],phone:['联系电话'],address:['公司地址'],email:['联系邮箱'],footerTagline:['页脚标语'],copyright:['版权说明'],accent:['主题颜色（#RRGGBB）']};Object.entries(labels).filter(([k])=>!['heroImage','aboutImage'].includes(k)).forEach(([k,[label,multi]])=>input(p,label,db.settings[k],v=>db.settings[k]=v,!!multi));imageField(p,'首页主视觉图片',db.settings,'heroImage');imageField(p,'公司介绍背景图片',db.settings,'aboutImage');btn(p,'保存全站设置',()=>save('settings'));return}
if(t==='stats'){editList(p,'stats',[['value','数字'],['unit','单位'],['label','说明']]);return}
if(t==='businesses'){editList(p,t,[['title','业务名称'],['desc','业务描述',true],['icon','图标字符']]);return}
if(t==='gallery'){p.append(e('p','当前 Render 免费实例的后台修改会在服务休眠或重新部署后重置。','hint'));editList(p,t,[['title','图片标题'],['alt','图片替代文字']]);return}
if(t==='jobs'){editList(p,t,[['title','岗位名称'],['type','岗位类型'],['salary','薪资说明'],['desc','岗位描述',true]]);return}
const items=db[t];if(!items.length)p.append(e('p','暂无记录','muted'));items.forEach(item=>{const c=e('div',undefined,'record');c.append(e('strong',item.name+' · '+item.phone));c.append(e('p',t==='messages'?'意向：'+item.interest+' ｜ '+item.message:'申请岗位：'+(db.jobs.find(j=>j.id===item.jobId)?.title||'已删除岗位')+' ｜ '+item.intro));c.append(e('small',new Date(item.createdAt).toLocaleString('zh-CN')));btn(c,'删除记录',async()=>{if(!confirm('确定删除这条记录？'))return;try{await api('/api/admin/delete','POST',{collection:t,id:item.id});db[t]=db[t].filter(x=>x.id!==item.id);show(t)}catch(err){alert(err.message)}},'danger');p.append(c)})}
async function enter(){try{db=await api('/api/admin/data');if(!db.stats)db.stats=[];if(!db.settings)db.settings={};$('#login').classList.add('hidden');$('#workspace').classList.remove('hidden');show('overview')}catch{token='';sessionStorage.removeItem('adminToken')}}
$('#loginForm').onsubmit=async ev=>{ev.preventDefault();const f=new FormData(ev.target);try{const r=await api('/api/login','POST',Object.fromEntries(f));token=r.token;sessionStorage.setItem('adminToken',token);await enter()}catch(err){$('#loginStatus').textContent=err.message}};document.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>show(b.dataset.tab));$('#logout').onclick=()=>{token='';sessionStorage.removeItem('adminToken');location.reload()};if(token)enter();