// Local review entry: isolated temporary progress, no intro video or audio playback.
if(new URLSearchParams(location.search).get('dev')!=='1'){
  const url=new URL(location.href);url.searchParams.set('dev','1');location.replace(url);
}else{
  const index=await(await fetch('./index.html', {cache:'no-cache'})).text();
  const entry=index.match(/src="(\.\/assets\/[^"\s]+\.js)"/)[1];
  await import(new URL('../'+entry.slice(2),import.meta.url));
  const game=window.__game,world=game.world;
  game.state.storage=null;
  game.state.reset();
  game.state.data.settings.volume=0;
  game.applySettings();
  window.__music.setEnabled(false);
  // Keep the review silent even if the music toggle is pressed during inspection.
  window.__music.setVolume(0);
  document.querySelector('.title-screen')?.remove();
  game.playing=true;world.setPaused(false);world.setInputEnabled(true);
  const musicButton=document.querySelector('[data-music-toggle]');
  if(musicButton){musicButton.disabled=true;musicButton.textContent='♪ 預覽：靜音';}
  const objective=document.querySelector('.objective');
  if(objective){objective.replaceChildren();const title=document.createElement('div');title.className='date';title.textContent='黑水詛咒 · 人物與診所重製';objective.append(title);}
  function go(position,theta,phi,distance){world.cancelRoute();world.playerVel.set(0,0,0);world.camTheta=theta;world.camPhi=phi;world.camDist=distance;world.setPlayerPos(position);world.updateNear();}
  const outside=()=>go([-9.0,0,13.5],1.16,.75,12.5);
  const inside=()=>go([-13.65,0,13.6],.78,.78,13);
  document.querySelector('#review-outside').onclick=outside;
  document.querySelector('#review-inside').onclick=inside;
  document.querySelector('#review-chat').onclick=()=>{inside();game.talk('wang');};
  outside();
  document.body.dataset.reviewReady='true';
}
