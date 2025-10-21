(function(){
  const state = { players: [], turn: 1 };
  const elPlayers = document.getElementById('players');
  const logList = document.getElementById('logList');

  function log(msg){
    const li = document.createElement('li');
    li.textContent = `[回合 ${state.turn}] ${msg}`;
    logList.prepend(li);
  }

  function save(){
    localStorage.setItem('lsim-state', JSON.stringify(state));
  }
  function load(){
    const s = localStorage.getItem('lsim-state');
    if(s){ Object.assign(state, JSON.parse(s)); }
  }

  function createPlayer(initial){
    const id = Date.now() + Math.random().toString(36).slice(2);
    return {
      id,
      name: '',
      health: initial.h,
      wealth: initial.w,
      happy: initial.hh,
      danger: 0,   // 健康危險倒數
      distress: 0, // 財富困境倒數
      low: 0,      // 幸福低落倒數
      dead: false,
      skip: 0      // 失去回合次數
    }
  }

  function render(){
    elPlayers.innerHTML = '';
    state.players.forEach(p => {
      const tmpl = document.getElementById('playerCardTmpl');
      const node = tmpl.content.cloneNode(true);
      const card = node.querySelector('.player-card');

      const nameInput = node.querySelector('.player-name');
      nameInput.value = p.name || '';
      nameInput.addEventListener('input', ()=>{ p.name = nameInput.value; save(); });

      // numbers
      const healthSpan = node.querySelector('.num.health');
      const wealthSpan = node.querySelector('.num.wealth');
      const happySpan  = node.querySelector('.num.happy');
      healthSpan.textContent = p.health;
      wealthSpan.textContent = p.wealth;
      happySpan.textContent  = p.happy;

      const minusBtns = node.querySelectorAll('.stat .minus');
      const plusBtns  = node.querySelectorAll('.stat .plus');

      minusBtns[0].addEventListener('click', ()=> adjust(p,'health',-1));
      plusBtns[0].addEventListener('click',  ()=> adjust(p,'health',+1));
      minusBtns[1].addEventListener('click', ()=> adjust(p,'wealth',-1));
      plusBtns[1].addEventListener('click',  ()=> adjust(p,'wealth',+1));
      minusBtns[2].addEventListener('click', ()=> adjust(p,'happy',-1));
      plusBtns[2].addEventListener('click',  ()=> adjust(p,'happy',+1));

      // actions
      card.querySelector('[data-action="loseTurn"]').addEventListener('click', ()=>{ if(!p.dead){ p.skip++; render(); log(`${p.name||'玩家'} 將失去 1 回合（累計 ${p.skip}）`); save(); } });
      card.querySelector('[data-action="recover"]').addEventListener('click', ()=>{ if(!p.dead){
        if(p.danger>0||p.distress>0||p.low>0){ p.danger=0; p.distress=0; p.low=0; log(`${p.name||'玩家'} 狀態改善，清除倒數`);} else { log(`${p.name||'玩家'} 無需改善`);} save(); render(); } });
      card.querySelector('[data-action="endanger"]').addEventListener('click', ()=>{ if(!p.dead){
        // 測試按鈕：按當前最低值觸發對應狀態
        const minV = Math.min(p.health,p.wealth,p.happy);
        if(minV===p.health) p.danger=2; else if(minV===p.wealth) p.distress=2; else p.low=2;
        render(); save(); log(`${p.name||'玩家'} 進入狀態倒數`);
      }});

      // badges
      const bDanger = node.querySelector('[data-badge="danger"]');
      const bDist   = node.querySelector('[data-badge="distress"]');
      const bLow    = node.querySelector('[data-badge="low"]');
      const bDead   = node.querySelector('[data-badge="dead"]');
      const bSkip   = node.querySelector('[data-badge="skip"]');
      if(p.danger>0){ bDanger.hidden=false; bDanger.querySelector('.ttl').textContent = p.danger; }
      if(p.distress>0){ bDist.hidden=false; bDist.querySelector('.ttl').textContent = p.distress; }
      if(p.low>0){ bLow.hidden=false; bLow.querySelector('.ttl').textContent = p.low; }
      if(p.dead){ bDead.hidden=false; }
      if(p.skip>0){ bSkip.hidden=false; bSkip.querySelector('.skipCount').textContent = p.skip; }

      // remove
      node.querySelector('.remove').addEventListener('click', ()=>{
        state.players = state.players.filter(x=>x.id!==p.id);
        save(); render();
      });

      // disable if dead
      if(p.dead){
        card.classList.add('is-dead');
        card.querySelectorAll('button').forEach(btn=>btn.disabled=true);
        card.querySelector('.remove').disabled=false;
      }

      elPlayers.appendChild(node);
    });
  }

  function adjust(p, key, delta){
    if(p.dead) return;
    p[key] = Math.max(0, p[key] + delta);
    // 進入或離開狀態門檻檢查
    if(key==='health'){
      if(p.health<=0 && p.danger===0) { p.danger=2; log(`${p.name||'玩家'} 健康耗盡 → 進入危險狀態（2 回合）`); }
      if(p.health>0 && p.danger>0){ p.danger=0; log(`${p.name||'玩家'} 健康回升，脫離危險`); }
    }
    if(key==='wealth'){
      if(p.wealth<=0 && p.distress===0) { p.distress=2; log(`${p.name||'玩家'} 財富耗盡 → 進入困境狀態（2 回合）`); }
      if(p.wealth>0 && p.distress>0){ p.distress=0; log(`${p.name||'玩家'} 財富改善，脫離困境`); }
    }
    if(key==='happy'){
      if(p.happy<=0 && p.low===0) { p.low=2; log(`${p.name||'玩家'} 幸福耗盡 → 進入低落狀態（2 回合）`); }
      if(p.happy>0 && p.low>0){ p.low=0; log(`${p.name||'玩家'} 幸福改善，脫離低落`); }
    }
    save(); render();
  }

  function nextTurn(){
    state.turn++;
    // 處理跳過回合與狀態倒數
    state.players.forEach(p=>{
      if(p.dead) return;
      if(p.skip>0){ p.skip--; log(`${p.name||'玩家'} 本回合被跳過，剩餘跳過：${p.skip}`); return; }
      // 狀態倒數
      if(p.danger>0){ p.danger--; if(p.danger===0 && p.health<=0){ p.dead=true; log(`${p.name||'玩家'} 因健康未恢復而死亡`); }}
      if(p.distress>0){ p.distress--; if(p.distress===0 && p.wealth<=0){ p.dead=true; log(`${p.name||'玩家'} 因財務無法維持而死亡`); }}
      if(p.low>0){ p.low--; if(p.low===0 && p.happy<=0){ p.dead=true; log(`${p.name||'玩家'} 因失去生活動力而死亡`); }}
    });
    document.getElementById('turnNum').textContent = state.turn;
    save(); render();
  }

  // Buttons
  document.getElementById('addPlayerBtn').addEventListener('click', ()=>{
    const init = {
      h: parseInt(document.getElementById('initHealth').value||'0',10),
      w: parseInt(document.getElementById('initWealth').value||'0',10),
      hh: parseInt(document.getElementById('initHappy').value||'0',10)
    };
    state.players.push(createPlayer(init));
    save(); render();
  });

  document.getElementById('resetAllBtn').addEventListener('click', ()=>{
    const init = {
      h: parseInt(document.getElementById('initHealth').value||'0',10),
      w: parseInt(document.getElementById('initWealth').value||'0',10),
      hh: parseInt(document.getElementById('initHappy').value||'0',10)
    };
    state.players.forEach(p=>{ if(!p.dead){ p.health=init.h; p.wealth=init.w; p.happy=init.hh; p.danger=p.distress=p.low=0; p.skip=0; }});
    log('全體重設為初始資源');
    save(); render();
  });

  document.getElementById('nextTurnBtn').addEventListener('click', nextTurn);

  // Group dialog
  const dlg = document.getElementById('groupDialog');
  document.getElementById('fullEventBtn').addEventListener('click', ()=> dlg.showModal());
  document.getElementById('applyGroupBtn').addEventListener('click', (e)=>{
    e.preventDefault();
    const dh = parseInt(document.getElementById('gHealth').value||'0',10);
    const dw = parseInt(document.getElementById('gWealth').value||'0',10);
    const dhh= parseInt(document.getElementById('gHappy').value||'0',10);
    const lose = document.getElementById('gLoseTurn').checked;
    state.players.forEach(p=>{
      if(p.dead) return;
      if(dh) adjust(p,'health',dh);
      if(dw) adjust(p,'wealth',dw);
      if(dhh) adjust(p,'happy',dhh);
      if(lose){ p.skip++; }
    });
    if(lose) log('全體將各失去 1 回合');
    dlg.close();
    save(); render();
  });

  // Export / Import
  document.getElementById('exportBtn').addEventListener('click', ()=>{
    const blob = new Blob([JSON.stringify(state,null,2)], {type:'application/json'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `life-sim-資源紀錄-回合${state.turn}.json`;
    a.click();
  });
  document.getElementById('importInput').addEventListener('change', (e)=>{
    const f = e.target.files[0]; if(!f) return;
    const reader = new FileReader();
    reader.onload = ()=>{
      try{ const data = JSON.parse(reader.result); Object.assign(state, data); render(); save(); log('已匯入紀錄'); }
      catch(err){ alert('匯入失敗：檔案格式錯誤'); }
    };
    reader.readAsText(f);
  });

  // init
  load();
  if(!state.players || !Array.isArray(state.players)) state.players=[];
  if(!state.turn) state.turn=1;
  render();
})();
