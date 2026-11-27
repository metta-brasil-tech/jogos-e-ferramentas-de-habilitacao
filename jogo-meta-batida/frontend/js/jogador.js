import { api, lerToken, guardarToken, relogio, enviarResposta, imagemLocal, elemento, desenharPodio, listasPorCargo, conectarRanking, aplicarCargoFixo, aplicarMarca, linkComTenant } from './cliente.js?v=20261127g';
const $=id=>document.getElementById(id);
const telas=['entrada','instrucoes','jogo','feedback','final'];
const rodadaLink=new URLSearchParams(globalThis.location?.search ?? '').get('r');
let token=null,estado=null,config=null,lojas=new Map(),geral=false;
let ocupado=false,sincronizando=false,configurando=false,enviando=false,respondida=null,restante=()=>0;
let proxima=null,perguntaAtual=null,feedbackAte=0,proximoSync=0,ultimaConsulta=0,rankingEm=0,tela='entrada',esperou=false;
const status=mensagem=>{$('status').textContent=mensagem;};
function mostrar(id) {document.body.classList.toggle('em-jogo',id==='jogo');tela=id;for(const t of telas)$(t).hidden=t!==id;}
const verLoja=()=>estado.rodada.podio==='loja'&&Boolean(estado.jogador.loja)&&!geral;
function posicao() {
 if(!estado)return;
 const lugar=verLoja()?estado.posicaoLoja:estado.posicao;
 $('posicao').textContent='Você: '+(lugar && estado.jogador.pontos>0?lugar+'º':estado.jogador.pontos+' pts');
}
const assinarRanking=conectarRanking({
 aoReceber:dados=>{
  desenharPodio($('podio'),dados.top,lojas,matchMedia('(max-width:899px)').matches);
  if(tela==='final' && performance.now()-rankingEm>5000){rankingEm=performance.now();void atualizarLista();}
  if(dados.liberada && estado?.rodada.travada && !sincronizando)void sincronizar();
 },
 aoStatus:s=>{if(!enviando)status(s==='SUBSCRIBED'?'':'Reconectando ao pódio…');}
});
function conectar() {assinarRanking(estado?estado.rodada.id:rodadaLink);}
async function configurar() {
 if(configurando)return;configurando=true;
 try {
  const c=await api('/api/config'+(rodadaLink?'?r='+encodeURIComponent(rodadaLink):''));config=c;lojas=new Map(c.lojas.map(l=>[l.filial,l.rotulo]));aplicarMarca(c);
  $('criar-rodada').href=linkComTenant('gerente.html');
  if(estado) {$('nova-rodada').hidden=!(c.rodada && c.rodada.id!==estado.rodada.id);return;}
  $('rodada').textContent=c.mensagem || (c.rodada.nome+(c.tenant?.cargoFixo&&c.rodada.responsavel?' · criada por '+c.rodada.responsavel+' para '+c.tenant.cargoFixo:''));
  if(rodadaLink) {
   $('criar-rodada').hidden=true;$('formulario').hidden=!c.rodada;
   if(c.rodada?.publico)for(const op of [...$('cargo').options])if(op.value && !op.textContent.match(/Regional|Outro/) && !c.rodada.publico.includes(op.textContent))op.remove();
   verCampoLoja();
  }
  $('entrar').disabled=!c.liberado || ocupado;
  const selecionada=$('loja').value;
  $('loja').replaceChildren(elemento('option','Escolha sua loja'));
  $('loja').firstChild.value='';
  for(const l of c.lojas){const op=elemento('option',l.rotulo);op.value=l.filial;$('loja').append(op);}
  $('loja').value=selecionada;
  aplicarCargoFixo(c,{botoes:$('listas'),carregar:atualizarLista});verNomes();verCampoLoja();
  if(c.rodada) {
   token=token || lerToken(c.rodada.id);
   if(token)await sincronizar();
  }
  conectar();
 } catch {status('Reconectando. Aguarde…');} finally {configurando=false;}
}
const atualizarLista=listasPorCargo($('listas'),$('ranking'),()=>({rodadaId:estado?.rodada.id,lojas,id:estado?.jogador.id}));
// Regras da tela de espera, montadas com os dados da própria rodada (perguntas, tempo, pódio).
function desenharRegras(e) {
 const r=e.rodada,t=config?.tenant||{},nomeLoja=t.rotuloLoja||'loja';
 const plural=(n,um,varios)=>n===1?um:varios;
 const min=m=>m<1?'menos de 1 minuto':'cerca de '+Math.round(m)+plural(Math.round(m),' minuto',' minutos');
 const itens=['Jogue com o seu nome.'];
 if(e.jogador.loja)itens.push(t.rotuloLoja?'Represente o seu '+nomeLoja+'.':'Represente a sua loja.');
 itens.push('Escolha uma opção: só uma é correta.');
 if(r.perguntas)itens.push('Esta rodada tem '+r.perguntas+plural(r.perguntas,' pergunta.',' perguntas.'));
 if(r.tempoMin){
  itens.push(r.tempoMin===r.tempoMax
   ?'Você tem '+r.tempoMin+' segundos para cada pergunta.'
   :'O tempo muda conforme a pergunta, de '+r.tempoMin+' a '+r.tempoMax+' segundos. Ele aparece na tela.');
  if(r.tempoTotal>=60)itens.push('Se usar todo o tempo, a rodada dura '+min(r.tempoTotal/60)+'.');
 } else itens.push('Cada pergunta tem tempo para responder.');
 itens.push('Quanto mais rápido acertar, mais pontos (de 500 a 1.000). Não dá para voltar.');
 itens.push('Sem resposta, você fica com zero na pergunta.');
 if(['Regional','Outro'].includes(e.jogador.cargo))itens.push('Como '+e.jogador.cargo+', você joga, mas não entra no pódio.');
 itens.push(r.podio==='loja'&&e.jogador.loja?'O pódio é por '+nomeLoja+'. Veja sua posição no ranking ao final.':'Veja sua posição no ranking ao final.');
 $('lista-regras').replaceChildren(...itens.map(txt=>elemento('li',txt)));
 const nome=r.nome?String(r.nome):'';
 $('sobretitulo-regras').textContent=nome?'PREPARE-SE PARA JOGAR · '+nome:'PREPARE-SE PARA JOGAR';
}
function renderizar(e,latencia=0) {
 estado=e;posicao();conectar();
 $('alternar').hidden=e.rodada.podio!=='loja' || !e.jogador.loja;
 if(e.feedback) {
  mostrar('feedback');
  const acertou=e.feedback.pontos>0;
  $('mensagem-feedback').textContent=acertou?e.feedback.mensagem:'Não foi dessa vez';
  $('detalhe-feedback').textContent=acertou?'':e.feedback.mensagem;$('detalhe-feedback').hidden=acertou;
  $('icone-feedback').textContent=acertou?'✓':'✕';
  $('caixa-feedback').classList.toggle('caixa-certa',acertou);$('caixa-feedback').classList.toggle('caixa-errada',!acertou);
  // Carrega a próxima pergunta enquanto o feedback aparece (sem iniciar o relógio dela).
  proxima=null;
  api('/api/jogador?previa=1',{token}).then(r=>{if(tela==='feedback' && r && !r.feedback && (r.pergunta || ['terminou','encerrada'].includes(r.situacao)))proxima=r;}).catch(()=>{});
  $('feedback').classList.toggle('acerto',e.feedback.pontos>0);$('feedback').classList.toggle('errou',e.feedback.pontos===0);
  feedbackAte=performance.now()+Math.max(0,e.feedback.restanteMs-latencia);proximoSync=feedbackAte+30;return;
 }
 if(['terminou','encerrada'].includes(e.situacao)) {
  mostrar('final');perguntaAtual=null;void atualizarLista();
  $('resultado').textContent=(e.posicao?(e.situacao==='terminou'?'Até agora: ':'Você: ')+e.posicao+'º lugar · '+e.jogador.nome:e.jogador.nome)+(e.situacao==='terminou'?' · A rodada ainda está em andamento.':'');
  $('estatisticas').replaceChildren(...[['pontos',e.jogador.pontos],['acertos',e.jogador.acertos],['erros',e.jogador.erros]].map(([rotulo,valor])=>{
   const div=elemento('div');div.append(elemento('strong',valor),elemento('span',rotulo));return div;
  }));
  return;
 }
 if(e.situacao==='aguardando') {
  respondida=null;perguntaAtual=null;mostrar('instrucoes');
  const travada=Boolean(e.rodada.travada);esperou=esperou || travada;
  $('comecar').disabled=travada;$('comecar').textContent=travada?'Aguarde o instrutor':'Começar';
  $('aviso-instrutor').textContent=travada?'Só comece quando o instrutor orientar. O jogo abre para todos ao mesmo tempo. Depois de começar, o tempo corre e não dá para voltar.':'Ao tocar em Começar, o tempo de cada pergunta passa a correr e não dá para voltar.';
  if(esperou && !travada){esperou=false;setTimeout(()=>void sincronizar(true),0);return;}
  desenharRegras(e);return;}
 if(!e.pergunta)return;
 const q=e.pergunta;
 restante=relogio(Math.max(0,q.restanteMs-latencia));
 if(perguntaAtual!==q.id) {
  perguntaAtual=q.id;respondida=null;
  $('numero').textContent='PERGUNTA '+q.numero+' / '+q.total;$('tema').textContent=q.tema;
  $('pergunta').textContent=q.texto;
  const foto=imagemLocal(q.imagem);$('foto').hidden=!foto;
  if(foto){$('foto').src=foto;$('foto').alt=q.produto || 'Imagem da pergunta';}
  $('opcoes').replaceChildren(...q.opcoes.map((texto,i)=>{
   const botao=elemento('button',undefined,'opcao');botao.type='button';botao.setAttribute('aria-label',String.fromCharCode(65+i)+': '+texto);
   botao.append(elemento('span',String.fromCharCode(65+i),'letra'),elemento('span',texto));
   botao.addEventListener('click',()=>void responder(q.id,i));return botao;
  }));
  const proxima=imagemLocal(q.proximaImagem);if(proxima){const img=new Image();img.src=proxima;}
 }
 mostrar('jogo');atualizarRelogio();
}
async function sincronizar(iniciar=false) {
 if(!token || sincronizando || enviando)return;
 sincronizando=true;const inicio=performance.now();
 try {
  const e=await api(iniciar?'/api/comecar':'/api/jogador',{token,...(iniciar?{body:{}}:{})});
  status('');renderizar(e,performance.now()-inicio);ultimaConsulta=performance.now();
  if(tela!=='feedback')proximoSync=performance.now()+(tela==='jogo'&&restante()===0?400:3000);
 } catch(e) {
  if(e.status===401) {token=null;estado=null;assinarRanking(null);mostrar('entrada');status('Sua participação não foi encontrada. Entre novamente.');}
  else {status('Reconectando. Aguarde…');proximoSync=performance.now()+800;}
 } finally {sincronizando=false;}
}
function atualizarRelogio() {
 const ms=restante(),s=Math.ceil(ms/1000);
 $('segundos').textContent=s+' s';const total=(estado.pergunta?.segundos ?? estado.rodada.segundos)*1000;$('barra').value=100*ms/total;
 $('barra').setAttribute('aria-valuetext',s+' segundos restantes');
 $('jogo').classList.toggle('urgente',s<=5);$('jogo').classList.toggle('aviso',s>5 && ms<total/2);
 if(ms===0 || respondida!==null)for(const b of $('opcoes').children)b.disabled=true;
}
async function responder(id,opcao) {
 if(enviando || respondida!==null || restante()<=0)return;
 respondida=id;enviando=true;
 for(const [i,b] of [...$('opcoes').children].entries()){b.disabled=true;b.classList.toggle('selecionada',i===opcao);}
 try {
  // /api/responder já devolve o estado com o feedback (acertou/errou + pontos) embutido —
  // usar essa resposta direto evita 1 round-trip extra e é o que faz a tela de feedback aparecer.
  const e=await enviarResposta({perguntaId:id,opcao},{restante,avisar:status,pedir:body=>api('/api/responder',{token,body,timeout:Math.max(1,Math.min(2500,restante()))})});
  status('');
  if(e)renderizar(e);else await sincronizar();
 } catch(e) {status(e.message);await sincronizar();}
 finally {enviando=false;}
}
// Gerente e Regional escolhem o nome na lista; quem não está nela digita em Outro.
function verNomes() {
 const cargo=$('cargo').value,nomes=config?.nomes?.[cargo] ?? [],lista=nomes.length>0,campo=$('nome-lista');
 if(lista && campo.dataset.cargo!==cargo) {
  const opcoes=[['','Escolha seu nome'],...nomes.map(n=>[n,n]),['outro','Outro: meu nome não está na lista']];
  campo.replaceChildren(...opcoes.map(([valor,texto])=>{const op=elemento('option',texto);op.value=valor;return op;}));campo.dataset.cargo=cargo;
 }
 const aberto=!lista || campo.value==='outro';
 $('campo-nome-lista').hidden=!lista;campo.required=lista;$('campo-nome').hidden=!aberto;$('nome').required=aberto;
}
$('nome-lista').addEventListener('change',verNomes);
function verCampoLoja() {
 const semLoja=['Regional','Outro'].includes($('cargo').value) || Boolean(config?.rodada?.loja);
 $('campo-loja').hidden=semLoja;$('loja').required=!semLoja;if(semLoja)$('loja').value='';
}
$('cargo').addEventListener('change',()=>{verNomes();verCampoLoja();});
$('formulario').addEventListener('submit',async evento=>{
 evento.preventDefault();if(ocupado || !config?.liberado)return;ocupado=true;$('entrar').disabled=true;
 try {
  const r=await api('/api/entrar',{body:{cargo:$('cargo').value,nome:$('nome-lista').required && $('nome-lista').value!=='outro'?$('nome-lista').value:$('nome').value,loja:$('loja').value,...(rodadaLink?{rodadaId:rodadaLink}:{}),...(token?{token}:{})}});
  token=r.token;
  await sincronizar();
  const salvo=guardarToken(estado?.rodada.id || config.rodada.id,token);
  if(!salvo)status('Seu navegador não permite salvar a participação. Mantenha esta página aberta.');
 } catch(e) {status(e.message || 'Reconectando. Tente entrar novamente.');}
 finally {ocupado=false;$('entrar').disabled=!config?.liberado;}
});
$('comecar').addEventListener('click',async()=>{$('comecar').disabled=true;await sincronizar(true);$('comecar').disabled=Boolean(estado?.rodada.travada);});
$('alternar').addEventListener('click',()=>{geral=!geral;$('alternar').textContent=geral?'Ver minha loja':'Ver geral';posicao();conectar();});
$('nova-rodada').addEventListener('click',()=>location.reload());
document.addEventListener('visibilitychange',()=>{if(!document.hidden){if(token)void sincronizar();else void configurar();}});
setInterval(()=>{
 if(tela==='jogo')atualizarRelogio();
 if(tela==='feedback' && proxima && performance.now()>=feedbackAte && !enviando){const p=proxima;proxima=null;renderizar(p);void sincronizar();return;}
 if(token && !enviando && !sincronizando) {
  const agora=performance.now();
  if((tela==='jogo' && restante()===0 && agora>=proximoSync) || (tela==='feedback' && agora>=feedbackAte && agora>=proximoSync) || (tela!=='feedback' && agora-ultimaConsulta>=3000 && agora>=proximoSync))void sincronizar();
 }
},100);
setInterval(()=>{if(!estado || tela==='final')void configurar();},5000);
void configurar();
