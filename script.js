(() => {
  'use strict';
  const data = window.RBL;
  const slides = Array.from(document.querySelectorAll('.slide'));
  const partButtons = Array.from(document.querySelectorAll('[data-part-jump]'));
  const stage = document.getElementById('stage');
  const viewport = document.getElementById('viewport');
  const overview = document.getElementById('overview');
  const sources = document.getElementById('sources');
  let current = -1, toastTimer, leavingTimer;
  const escape = value => String(value).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  function fit() {
    const r = viewport.getBoundingClientRect();
    const scale = Math.max(.05, Math.min((r.width - 12) / 1600, (r.height - 12) / 900));
    stage.style.setProperty('--deck-scale', String(scale));
  }
  function fromHash() {
    const match = location.hash.match(/^#(?:trang-|slide-)?(\d+)$/);
    return match ? Math.min(19, Math.max(0, Number(match[1])-1)) : 0;
  }
  function go(index, updateHash = true) {
    index = Math.max(0, Math.min(slides.length-1, index));
    if (index === current) return;
    const old = current, reverse = old >= 0 && index < old;
    clearTimeout(leavingTimer);
    slides.forEach((el, i) => {
      el.classList.remove('leaving','reversing');
      el.style.transform='';
      el.classList.toggle('active', i === index);
      el.setAttribute('aria-hidden', i === index ? 'false' : 'true');
      el.inert = i !== index;
    });
    if (old >= 0) {
      slides[old].classList.add('leaving');
      if (reverse) { slides[old].style.transform='translateX(24px)'; }
      leavingTimer=setTimeout(() => {slides[old].classList.remove('leaving');slides[old].style.transform='';},500);
    }
    current=index;
    partButtons.forEach((b,i) => {
      const yes = Math.floor(index/4) === i;
      b.classList.toggle('active',yes);
      b.setAttribute('aria-current',yes?'step':'false');
    });
    document.getElementById('position').textContent = `${String(index+1).padStart(2,'0')} / 20`;
    document.getElementById('progress-fill').style.width=`${(index+1)*5}%`;
    document.getElementById('prev').disabled=index===0;
    document.getElementById('next').disabled=index===19;
    document.title=`${String(index+1).padStart(2,'0')} · ${data.slides[index].title}`;
    if(updateHash) { try { history.replaceState(null,'',`#trang-${index+1}`); } catch (_) {location.hash=`trang-${index+1}`;} }
    // Local storage is optional: some local-file browsers do not permit it.
    try { localStorage.setItem('rbl-current-slide',String(index+1)); } catch (_) {}
    document.querySelectorAll('#overview [data-slide-jump]').forEach(b=>b.classList.toggle('current',Number(b.dataset.slideJump)===index));
  }
  function notify(message) {
    const el=document.getElementById('toast');el.textContent=message;el.classList.add('visible');
    clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('visible'),2500);
  }
  function openDialog(el) { if(!el.open) el.showModal(); }
  function closeDialogs() { [overview,sources].forEach(d=>{if(d.open)d.close();}); }
  function toggleFullscreen() {
    if(document.fullscreenElement) { document.exitFullscreen().catch(()=>{}); }
    else if(document.documentElement.requestFullscreen) { document.documentElement.requestFullscreen().catch(()=>notify('Có thể dùng phím F11 để mở toàn màn hình.')); }
    else notify('Hãy dùng chế độ toàn màn hình của trình duyệt.');
  }
  document.getElementById('source-list').innerHTML=data.sources.map(s=>`<article class="source-item"><span>[${s.n}]</span><div><a href="${escape(s.url)}" target="_blank" rel="noopener noreferrer">${escape(s.short)} — ${escape(s.title)} ↗</a><small>${escape(s.publisher)}</small><p>${escape(s.use)}</p></div></article>`).join('');
  document.getElementById('overview-list').innerHTML=data.groups.map((g,i)=>`<section class="overview-group"><h3>${String(i+1).padStart(2,'0')} · ${escape(g.title)} <small>${escape(g.name)} · ${g.id}</small></h3><div class="overview-grid">${data.slides.filter(s=>s.part===i).map(s=>`<button data-slide-jump="${s.n-1}"><b>${String(s.n).padStart(2,'0')}</b>${escape(s.title)}</button>`).join('')}</div></section>`).join('');
  partButtons.forEach(b=>b.addEventListener('click',()=>go(Number(b.dataset.partJump)*4)));
  document.getElementById('prev').addEventListener('click',()=>go(current-1));
  document.getElementById('next').addEventListener('click',()=>go(current+1));
  document.getElementById('overview-button').addEventListener('click',()=>openDialog(overview));
  document.getElementById('fullscreen').addEventListener('click',toggleFullscreen);
  document.querySelectorAll('[data-open-sources]').forEach(b=>b.addEventListener('click',()=>openDialog(sources)));
  document.querySelectorAll('[data-slide-jump]').forEach(b=>b.addEventListener('click',()=>{go(Number(b.dataset.slideJump));overview.close();}));
  [overview,sources].forEach(d=>{
    d.querySelector('.close').addEventListener('click',()=>d.close());
    d.addEventListener('click',e=>{if(e.target===d){const r=d.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)d.close();}});
  });
  document.addEventListener('keydown',e=>{
    if(e.key==='Escape') {closeDialogs();return;}
    if(overview.open||sources.open||e.altKey||e.ctrlKey||e.metaKey) return;
    if(e.target.closest('input,textarea,select,[contenteditable="true"]')) return;
    // A focused button or link keeps its native Enter/Space behavior.
    if((e.key===' '||e.key==='Enter')&&e.target.closest('button,a')) return;
    const key=e.key;
    if(['ArrowRight','ArrowDown','PageDown',' '].includes(key)){e.preventDefault();go(current+1);}
    else if(['ArrowLeft','ArrowUp','PageUp'].includes(key)){e.preventDefault();go(current-1);}
    else if(key==='Home'){e.preventDefault();go(0);}
    else if(key==='End'){e.preventDefault();go(19);}
    else if(/^[1-5]$/.test(key)){e.preventDefault();go((Number(key)-1)*4);}
    else if(key.toLowerCase()==='f'){e.preventDefault();toggleFullscreen();}
    else if(key.toLowerCase()==='o'){e.preventDefault();openDialog(overview);}
  });
  let start=null;
  viewport.addEventListener('touchstart',e=>{if(e.target.closest('a,button'))return;start={x:e.changedTouches[0].clientX,y:e.changedTouches[0].clientY};},{passive:true});
  viewport.addEventListener('touchend',e=>{if(!start)return;const dx=e.changedTouches[0].clientX-start.x,dy=e.changedTouches[0].clientY-start.y;if(Math.abs(dx)>55&&Math.abs(dx)>Math.abs(dy)*1.5)go(current+(dx<0?1:-1));start=null;},{passive:true});
  window.addEventListener('hashchange',()=>go(fromHash(),false));
  window.addEventListener('resize',fit);
  document.addEventListener('fullscreenchange',()=>setTimeout(fit,60));
  if('ResizeObserver' in window)new ResizeObserver(fit).observe(viewport);
  go(fromHash(),false); fit();
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(() => requestAnimationFrame(fit));
  }
  window.addEventListener('pageshow', fit);
  // Used by the local visual check; no network calls or analytics.
  window.rblDeck={go:oneBased=>go(Number(oneBased)-1),current:()=>current+1};
})();
