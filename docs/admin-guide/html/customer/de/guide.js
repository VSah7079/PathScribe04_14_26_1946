/* Administrator Guide behaviour (Batch 646, languages Batch 647): language switcher, search, ?q= from the Help redirect, setup checklist ticks (this browser only). */
(function(){
  var q=document.getElementById('q'),res=document.getElementById('results'),idx=window.PS_INDEX||[];
  function norm(s){return (s||'').toLowerCase();}
  function run(){
    var v=norm(q.value).trim();if(v.length<2){res.hidden=true;res.innerHTML='';return;}
    var terms=v.split(/\s+/),hits=[];
    idx.forEach(function(e){
      var hay=norm(e.title+' '+e.crumb+' '+e.keys.join(' ')+' '+e.id);var ok=terms.every(function(t){return hay.indexOf(t)>-1;});
      if(!ok)return;var s=0;terms.forEach(function(t){if(norm(e.title).indexOf(t)>-1)s+=3;if(norm(e.id).indexOf(t)>-1)s+=2;});
      hits.push({e:e,s:s});
    });
    hits.sort(function(a,b){return b.s-a.s;});hits=hits.slice(0,12);
    res.innerHTML=hits.length?hits.map(function(h){var e=h.e;return '<li><a href="'+e.page+'#'+e.id+'">'+esc(e.title)+'<small>'+esc(e.crumb||e.chapter)+'</small></a></li>';}).join(''):'<li><a href="#" tabindex="-1">'+esc((window.PS_STR||{}).noMatch||'No match')+'</a></li>';
    res.hidden=false;
  }
  function esc(s){return String(s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];});}
  if(q){q.addEventListener('input',run);document.addEventListener('click',function(e){if(!res.contains(e.target)&&e.target!==q)res.hidden=true;});
    q.addEventListener('keydown',function(e){if(e.key==='Escape'){res.hidden=true;}});
    var m=/[?&]q=([^&]+)/.exec(location.search);if(m){q.value=decodeURIComponent(m[1]);run();}}
  var KEY='ps-admin-guide-setup';var done={};try{done=JSON.parse(localStorage.getItem(KEY)||'{}');}catch(e){}
  document.querySelectorAll('input[data-seq]').forEach(function(b){b.checked=!!done[b.dataset.seq];b.addEventListener('change',function(){done[b.dataset.seq]=b.checked;try{localStorage.setItem(KEY,JSON.stringify(done));}catch(e){}});});
  var sel=document.getElementById('lang');
  if(sel){sel.addEventListener('change',function(){var b=document.body,root=b.getAttribute('data-root')||'',page=location.pathname.split('/').pop()||'index.html';
    location.href=root+(sel.value==='en'?'':sel.value+'/')+page+location.hash;});}
})();

/* Batch 669d: the Help buttons open the guide at a section (page#screen-...). Screenshots load lazily and have no size until they arrive,
   so the browser's own jump lands far above or below the section. Load the pictures that sit before the section now, and jump again
   as they arrive, until the reader scrolls. */
(function(){
  var id=decodeURIComponent((location.hash||'').slice(1));if(!id)return;
  var target=document.getElementById(id);if(!target)return;
  var moved=false;
  ['wheel','touchstart','keydown','mousedown'].forEach(function(ev){addEventListener(ev,function(){moved=true;},{once:true,passive:true});});
  function jump(){if(!moved)target.scrollIntoView();}
  Array.prototype.forEach.call(document.images,function(img){
    if(!(img.compareDocumentPosition(target)&Node.DOCUMENT_POSITION_FOLLOWING))return;
    img.loading='eager';
    if(!img.complete)img.addEventListener('load',jump);
  });
  jump();addEventListener('load',function(){jump();setTimeout(jump,400);});
})();
