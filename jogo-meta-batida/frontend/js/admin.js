import { api, elemento, linkComTenant, aplicarMarca } from './cliente.js';
import { API, CLIENTE } from './config.js';
const $=id=>document.getElementById(id);
let senha='',estado=null;
// Bloco em foco na aba Perguntas: '' = todos; SEM_BLOCO = perguntas sem bloco; outro = nome do bloco.
const SEM_BLOCO='__sem-bloco__';let blocoAtual='';const blocosNovos=new Set();
const blocoNomeado=()=>blocoAtual!=='' && blocoAtual!==SEM_BLOCO;
const noBloco=p=>blocoAtual===''?true:blocoAtual===SEM_BLOCO?!p.bloco:p.bloco===blocoAtual;
const mensagem=m=>{$('mensagem').textContent=m;};
const chamar=(acao,extra={})=>api('/api/admin',{body:{senha,acao,...extra}});
const input=(tipo,placeholder)=>{const i=elemento('input');i.type=tipo;i.placeholder=placeholder;return i;};
function botao(texto,fn,classe='discreto') {
 const b=elemento('button',texto,classe);b.type='button';
 b.addEventListener('click',async()=>{try{await fn();}catch(err){mensagem(err.message||'Não foi possível concluir.');}});
 return b;
}
function linkCopiavel(rotulo,url) {
 const p=elemento('p');
 const campo=elemento('input');campo.readOnly=true;campo.value=url;
 const copiar=botao('Copiar',async()=>{
  try {await navigator.clipboard.writeText(url);mensagem(rotulo+' copiado.');}
  catch {campo.select();mensagem('Selecione e copie o link.');}
 });
 p.append(rotulo+': ',campo,copiar);
 return p;
}

// ---- Rodadas ----------------------------------------------------------
function desenharRodadas() {
 $('lista-rodadas').replaceChildren(...estado.rodadas.map(r=>{
  const card=elemento('article',undefined,'painel');
  card.append(elemento('h3',r.nome));
  card.append(elemento('p',`${r.status} · ${r.travada?'travada (aguardando início)':'liberada'} · pódio ${r.podio}${r.bloco?' · bloco "'+r.bloco+'"':''}`));
  card.append(linkCopiavel('Link do jogo',linkComTenant('?r='+r.id)));
  card.append(linkCopiavel('Link do telão',linkComTenant('telao.html?r='+r.id)));
  card.append(elemento('p',r.esperados?`${r.esperados} nome(s) na lista de seleção.`:'Sem lista de nomes esperados (jogador digita o nome livremente).'));
  const barra=elemento('div',undefined,'barra');
  if(r.status==='aberta') {
   if(r.travada)barra.append(botao('Começar para todos',()=>acaoRodada('rodada-comecar-todos',r.id),'principal'));
   barra.append(botao('Resetar',async()=>{if(confirm('Resetar '+r.nome+'? Apaga os pontos e trava de novo.'))await acaoRodada('rodada-resetar',r.id);}));
   barra.append(botao('Encerrar',async()=>{if(confirm('Encerrar '+r.nome+'? Não dá pra reabrir.'))await acaoRodada('rodada-encerrar',r.id);}));
  }
  barra.append(botao('Ver ranking',()=>verRanking(r.id)));
  barra.append(botao('Importar lista de nomes',()=>importarLista(r.id,r.nome)));
  const csv=elemento('a','Exportar CSV','discreto');
  csv.href=API+'/admin/csv?c='+encodeURIComponent(CLIENTE)+'&rodadaId='+encodeURIComponent(r.id)+'&senha='+encodeURIComponent(senha);
  csv.target='_blank';csv.rel='noopener';
  barra.append(csv);
  const xlsx=elemento('a','Exportar Excel (com cores)','discreto');
  xlsx.href=API+'/admin/xlsx?c='+encodeURIComponent(CLIENTE)+'&rodadaId='+encodeURIComponent(r.id)+'&senha='+encodeURIComponent(senha);
  xlsx.target='_blank';xlsx.rel='noopener';
  barra.append(xlsx);
  card.append(barra);
  return card;
 }));
 if(!estado.rodadas.length)$('lista-rodadas').replaceChildren(elemento('p','Nenhuma rodada ainda.'));
}
async function acaoRodada(acao,id) {await chamar(acao,{id});await atualizar();}

function desenharBlocos() {
 const sel=$('r-bloco'),atual=sel.value;
 sel.replaceChildren(elemento('option','Todas (sem bloco)'));sel.firstChild.value='';
 for(const b of estado.blocos){const o=elemento('option',b);o.value=b;sel.append(o);}
 sel.value=atual;
 // Sugestão (datalist) nos campos de texto "Bloco" do cadastro/edição de pergunta —
 // evita digitar o nome de um bloco já existente com erro de digitação.
 $('blocos-existentes').replaceChildren(...estado.blocos.map(b=>{const o=elemento('option');o.value=b;return o;}));
}
function desenharLojas() {
 const sel=$('r-loja'),atual=sel.value;
 sel.replaceChildren(elemento('option','Nenhuma (qualquer loja)'));sel.firstChild.value='';
 for(const l of estado.lojas){const o=elemento('option',l.rotulo);o.value=l.filial;sel.append(o);}
 sel.value=atual;
 $('lista-lojas').replaceChildren(...estado.lojas.map(l=>{
  const card=elemento('article',undefined,'painel');
  card.append(elemento('p',`${l.filial} — ${l.rotulo}`));
  const barra=elemento('div',undefined,'barra');
  barra.append(botao('Remover',async()=>{
   if(!confirm(`Remover a loja "${l.rotulo}"?`))return;
   await chamar('loja-remover',{filial:l.filial});await atualizar();
  }));
  card.append(barra);
  return card;
 }));
 if(!estado.lojas.length)$('lista-lojas').replaceChildren(elemento('p','Nenhuma loja cadastrada.'));
}
$('form-loja').addEventListener('submit',async e=>{
 e.preventDefault();
 try {
  await chamar('loja-salvar',{filial:$('l-filial').value.trim(),rotulo:$('l-rotulo').value.trim()});
  $('form-loja').reset();mensagem('Loja salva.');
  await atualizar();
 } catch(err) {mensagem(err.message);}
});
$('r-podio').addEventListener('change',()=>{$('r-campo-loja').hidden=$('r-podio').value!=='loja';});
$('form-rodada').addEventListener('submit',async e=>{
 e.preventDefault();
 try {
  await chamar('rodada-criar',{
   nome:$('r-nome').value,podio:$('r-podio').value,
   loja:$('r-loja').value||null,bloco:$('r-bloco').value||null,publico:$('r-publico').value||null,
  });
  $('form-rodada').reset();mensagem('Rodada criada — ela só começa quando você clicar em "Começar para todos".');
  await atualizar();
 } catch(err) {mensagem(err.message);}
});

// ---- Ranking e detalhe por jogador (clicar no nome) --------------------
function abrirDetalhe(titulo,conteudo) {$('detalhe-titulo').textContent=titulo;$('detalhe-conteudo').replaceChildren(conteudo);if(!$('detalhe').open)$('detalhe').showModal();}
$('fechar-detalhe').addEventListener('click',()=>$('detalhe').close());
async function verRanking(rodadaId) {
 const r=await api('/api/ranking?'+new URLSearchParams({rodadaId}));
 const div=elemento('div');
 for(const l of r.linhas) {
  const b=botao(`${l.posicao}º ${l.nome} — ${l.pontos} pts`,()=>verDetalheJogador(l.id,l.nome));
  const liberar=botao('Liberar',()=>liberarJogador(l.id,l.nome,rodadaId));
  const p=elemento('p');p.append(b,' ',liberar);div.append(p);
 }
 if(!r.linhas.length)div.append(elemento('p','Ninguém jogou ainda.'));
 abrirDetalhe('Ranking',div);
}
async function liberarJogador(jogadorId,nome,rodadaId) {
 if(!confirm(`Liberar "${nome}"? Apaga a participação dele (pontos e respostas) — ele poderá entrar de novo com o mesmo nome.`))return;
 await chamar('jogador-liberar',{jogadorId});
 mensagem(nome+' liberado(a).');
 await verRanking(rodadaId);
}
async function verDetalheJogador(jogadorId,nome) {
 const d=await chamar('jogador-detalhe',{jogadorId});
 const div=elemento('div');
 div.append(elemento('p',`${d.jogador.pontos} pts · ${d.jogador.acertos} acertos · ${d.jogador.erros} erros`));
 for(const l of d.respostas) {
  const p=elemento('p');
  p.append(elemento('strong',`${l.numero}. ${l.tema?l.tema+' — ':''}`));
  p.append(elemento('span',l.respondeu
   ?(l.acertou?`acertou: "${l.opcaoEscolhida}"`:`errou: "${l.opcaoEscolhida}" (certa: "${l.opcaoCorreta}")`)
   :`não respondeu (certa: "${l.opcaoCorreta}")`));
  div.append(p);
 }
 abrirDetalhe(nome,div);
}
function importarLista(rodadaId,nomeRodada) {
 const div=elemento('div');
 div.append(elemento('p','1 nome por linha. Pode incluir o cargo depois de uma vírgula, ex.: "Maria Silva, Vendedor". Substitui a lista inteira dessa rodada.'));
 const texto=elemento('textarea');texto.rows=10;texto.style.width='100%';
 const avisos=elemento('div');
 const salvar=botao('Importar',async()=>{
  try {
   const r=await chamar('lista-importar',{rodadaId,texto:texto.value});
   avisos.replaceChildren(elemento('p',`${r.importados} nome(s) importado(s).`));
   for(const a of r.avisos)avisos.append(elemento('p',a));
   await atualizar();
  } catch(err) {avisos.replaceChildren(elemento('p',err.message));}
 },'principal');
 div.append(texto,salvar,avisos);
 abrirDetalhe('Lista de nomes — '+nomeRodada,div);
}

// ---- Perguntas: cadastro em lote + ativas/ocultas/excluídas ------------
function novaLinhaPergunta() {
 const linha=elemento('div',undefined,'painel');
 const texto=input('text','Pergunta');
 const tipo=input('text','Tipo (ex.: Venda)');
 const tema=input('text','Tema (ex.: Aborde)');
 const opcoes=[0,1,2,3].map(i=>input('text','Opção '+String.fromCharCode(65+i)));
 const correta=elemento('select');
 for(let i=0;i<4;i++){const o=elemento('option','Correta: '+String.fromCharCode(65+i));o.value=String(i);correta.append(o);}
 const segundos=input('number','Segundos (tempo desta pergunta)');segundos.min='5';segundos.max='3600';segundos.value='30';segundos.required=true;segundos.setAttribute('aria-label','Segundos para responder esta pergunta');
 const bloco=input('text','Bloco (opcional, ex.: Bloco 1)');bloco.setAttribute('list','blocos-existentes');
 if(blocoNomeado()){bloco.value=blocoAtual;bloco.readOnly=true;bloco.title='Esta pergunta entra no bloco '+blocoAtual;}
 const imagem=input('text','URL da imagem (opcional)');
 const remover=botao('Remover esta pergunta',()=>linha.remove());
 linha.append(texto,tipo,tema,...opcoes,correta,segundos,bloco,imagem,remover);
 linha._coletar=()=>({
  texto:texto.value.trim(),tipo:tipo.value.trim()||null,tema:tema.value.trim()||null,
  opcoes:opcoes.map(o=>o.value.trim()),correta:Number(correta.value),
  segundos:Number(segundos.value),bloco:bloco.value.trim()||null,imagem:imagem.value.trim()||null,
 });
 return linha;
}
$('add-pergunta').addEventListener('click',()=>{$('lote-perguntas').append(novaLinhaPergunta());});
$('salvar-lote').addEventListener('click',async()=>{
 const linhas=[...$('lote-perguntas').children];
 if(!linhas.length)return mensagem('Clique em "+ Nova pergunta" pelo menos uma vez.');
 const perguntas=linhas.map(l=>l._coletar());
 for(const p of perguntas)if(!p.texto || p.opcoes.some(o=>!o))return mensagem('Preencha o texto e as 4 opções de cada pergunta.');
 for(const p of perguntas)if(!(p.segundos>=5 && p.segundos<=3600))return mensagem('Informe o tempo de cada pergunta, entre 5 e 3600 segundos.');
 try {
  const r=await chamar('perguntas-criar',{perguntas});
  mensagem(r.criadas+' pergunta(s) cadastrada(s).');
  $('lote-perguntas').replaceChildren();
  await atualizar();
 } catch(err) {mensagem(err.message);}
});
$('copiar-base').addEventListener('click',async()=>{
 try {
  const r=await chamar('perguntas-copiar-base');
  mensagem(r.copiadas?`${r.copiadas} pergunta(s) base copiada(s).`:'Nenhuma pergunta base nova pra copiar (já estão todas aqui).');
  await atualizar();
 } catch(err) {mensagem(err.message);}
});
const LETRAS=['A','B','C','D'];
function linhaPerguntaExistente(p,acoes) {
 const div=elemento('article',undefined,'painel pergunta-admin');
 const rotulos=[p.tema,p.tipo,p.bloco&&('Bloco: '+p.bloco),p.segundos&&(p.segundos+' s')].filter(Boolean);
 if(rotulos.length)div.append(elemento('p',rotulos.join(' · '),'pergunta-rotulos'));
 div.append(elemento('p',(p.base?'[Base] ':'')+p.texto,'pergunta-texto'));
 if(Array.isArray(p.opcoes)&&p.opcoes.length){
  const lista=elemento('ol',undefined,'alternativas');
  p.opcoes.forEach((o,i)=>{
   const certa=i===p.correta;
   const li=elemento('li',undefined,certa?'alternativa correta':'alternativa');
   li.append(elemento('span',LETRAS[i],'letra'),elemento('span',o,'texto-alternativa'));
   if(certa)li.append(elemento('strong','Correta','selo-correta'));
   lista.append(li);
  });
  div.append(lista);
 }
 const barra=elemento('div',undefined,'barra');
 for(const [texto,fn] of acoes)barra.append(botao(texto,fn));
 div.append(barra);
 return div;
}
function campoRotulado(rotulo,campo) {
 const id='ed-'+Math.random().toString(36).slice(2,9);campo.id=id;
 const wrap=elemento('div',undefined,'campo-edicao');
 const l=elemento('label',rotulo);l.htmlFor=id;
 wrap.append(l,campo);return wrap;
}
async function acaoPergunta(acao,id) {await chamar(acao,{id});await atualizar();}
function editarPergunta(p) {
 const div=elemento('div',undefined,'edicao-pergunta');
 const texto=elemento('textarea');texto.rows=3;texto.value=p.texto;
 const nome='correta-'+p.id;
 const linhas=[0,1,2,3].map(i=>{
  const linha=elemento('label',undefined,'alternativa-edicao');
  const radio=elemento('input');radio.type='radio';radio.name=nome;radio.value=String(i);radio.checked=i===p.correta;
  radio.setAttribute('aria-label','Marcar a alternativa '+LETRAS[i]+' como correta');
  const inp=input('text','Alternativa '+LETRAS[i]);inp.value=(p.opcoes||[])[i]||'';
  inp.setAttribute('aria-label','Texto da alternativa '+LETRAS[i]);
  const marcar=()=>{for(const l of linhasEl)l.classList.toggle('correta',l.querySelector('input[type=radio]').checked);};
  radio.addEventListener('change',()=>marcar());
  linha.append(radio,elemento('span',LETRAS[i],'letra'),inp);
  linha._radio=radio;linha._texto=inp;
  return linha;
 });
 const linhasEl=linhas;
 for(const l of linhas)l.classList.toggle('correta',l._radio.checked);
 const tipo=input('text','ex.: Fácil');tipo.value=p.tipo||'';
 const tema=input('text','ex.: Mapear');tema.value=p.tema||'';
 const segundos=input('number','tempo desta pergunta');segundos.min='5';segundos.max='3600';segundos.value=p.segundos||30;
 const bloco=input('text','opcional');bloco.value=p.bloco||'';bloco.setAttribute('list','blocos-existentes');
 const imagem=input('text','opcional');imagem.value=p.imagem||'';
 const aviso=elemento('p','',undefined);aviso.setAttribute('role','status');
 const salvar=botao('Salvar alterações',async()=>{
  const opcoesVal=linhas.map(l=>l._texto.value.trim());
  const marcada=linhas.findIndex(l=>l._radio.checked);
  if(!texto.value.trim() || opcoesVal.some(o=>!o)) {aviso.textContent='Preencha a pergunta e as 4 alternativas.';return;}
  if(marcada<0) {aviso.textContent='Marque qual alternativa é a correta.';return;}
  try {
   await chamar('pergunta-editar',{
    id:p.id,texto:texto.value.trim(),tipo:tipo.value.trim()||null,tema:tema.value.trim()||null,
    opcoes:opcoesVal,correta:marcada,segundos:Number(segundos.value)||30,
    bloco:bloco.value.trim()||null,imagem:imagem.value.trim()||null,
   });
   $('detalhe').close();mensagem('Pergunta atualizada.');
   await atualizar();
  } catch(err) {aviso.textContent=err.message;}
 },'principal');
 const grupo=elemento('fieldset',undefined,'alternativas-edicao');
 grupo.append(elemento('legend','Alternativas (marque a correta)'),...linhas);
 const extras=elemento('div',undefined,'extras-edicao');
 extras.append(campoRotulado('Tema',tema),campoRotulado('Tipo / nível',tipo),campoRotulado('Bloco',bloco),
  campoRotulado('Tempo da pergunta (segundos)',segundos),campoRotulado('URL da imagem',imagem));
 div.append(campoRotulado('Pergunta',texto),grupo,extras,aviso,salvar);
 abrirDetalhe('Editar pergunta',div);
}
function desenharFiltroBlocos() {
 const nomes=[...new Set([...estado.blocos,...blocosNovos])].sort((a,b)=>a.localeCompare(b,'pt-BR'));
 if(blocoNomeado() && !nomes.includes(blocoAtual))nomes.push(blocoAtual);
 const sel=$('filtro-bloco');
 const op=(t,v)=>{const o=elemento('option',t);o.value=v;return o;};
 sel.replaceChildren(op('Todos os blocos',''),...nomes.map(n=>op(n,n)),op('Sem bloco',SEM_BLOCO));
 sel.value=blocoAtual;
 const ativas=estado.perguntasAtivas.filter(noBloco).length;
 $('bloco-info').textContent=blocoNomeado()
  ?`Bloco "${blocoAtual}": ${ativas} pergunta(s) ativa(s). As perguntas novas entram neste bloco.`
  :blocoAtual===SEM_BLOCO?`Perguntas sem bloco: ${ativas} ativa(s).`:'Mostrando as perguntas de todos os blocos.';
 $('titulo-lote').textContent=blocoNomeado()?'Cadastrar perguntas no bloco "'+blocoAtual+'"':'Cadastrar perguntas (em lote)';
}
function trocarBloco(novo,abrirVazio=false) {
 if(novo===blocoAtual && !abrirVazio)return true;
 if($('lote-perguntas').children.length && !confirm('Há perguntas não salvas na área de cadastro. Descartar e trocar de bloco?')){$('filtro-bloco').value=blocoAtual;return false;}
 blocoAtual=novo;$('lote-perguntas').replaceChildren();
 if(abrirVazio)$('lote-perguntas').append(novaLinhaPergunta());
 desenharPerguntas();return true;
}
$('filtro-bloco').addEventListener('change',()=>trocarBloco($('filtro-bloco').value));
$('novo-bloco').addEventListener('click',()=>{$('novo-bloco-form').hidden=false;$('nome-novo-bloco').value='';$('nome-novo-bloco').focus();});
$('cancelar-bloco').addEventListener('click',()=>{$('novo-bloco-form').hidden=true;});
const criarBloco=()=>{
 const nome=$('nome-novo-bloco').value.trim().replace(/\s+/g,' ');
 if(!nome)return mensagem('Dê um nome ao bloco.');
 if(nome===SEM_BLOCO)return mensagem('Escolha outro nome.');
 const existe=estado.blocos.includes(nome)||blocosNovos.has(nome);
 if(!existe)blocosNovos.add(nome);
 if(!trocarBloco(nome,!existe))return;
 $('novo-bloco-form').hidden=true;
 mensagem(existe?`O bloco "${nome}" já existia: mostrando as perguntas dele.`:`Bloco "${nome}" criado. Preencha as perguntas e clique em "Salvar todas"; o bloco só fica gravado com a primeira pergunta salva.`);
};
$('criar-bloco').addEventListener('click',criarBloco);
$('nome-novo-bloco').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();criarBloco();}});
function desenharPerguntas() {
 desenharFiltroBlocos();
 $('lista-ativas').replaceChildren(...estado.perguntasAtivas.filter(noBloco).map(p=>linhaPerguntaExistente(p,[
  ['Editar',()=>editarPergunta(p)],
  ['Ocultar',()=>acaoPergunta('pergunta-ocultar',p.id)],['Excluir',()=>acaoPergunta('pergunta-excluir',p.id)],
 ])));
 $('lista-ocultas').replaceChildren(...estado.perguntasOcultas.filter(noBloco).map(p=>linhaPerguntaExistente(p,[
  ['Editar',()=>editarPergunta(p)],
  ['Reativar',()=>acaoPergunta('pergunta-reativar',p.id)],['Excluir',()=>acaoPergunta('pergunta-excluir',p.id)],
 ])));
 $('lista-excluidas').replaceChildren(...estado.perguntasExcluidas.filter(noBloco).map(p=>linhaPerguntaExistente(p,[
  ['Restaurar',()=>acaoPergunta('pergunta-restaurar',p.id)],
 ])));
 if(!estado.perguntasAtivas.filter(noBloco).length)$('lista-ativas').append(elemento('p','Nenhuma.'));
 if(!estado.perguntasOcultas.filter(noBloco).length)$('lista-ocultas').append(elemento('p','Nenhuma.'));
 if(!estado.perguntasExcluidas.filter(noBloco).length)$('lista-excluidas').append(elemento('p','Nenhuma.'));
}

// ---- Abas, login e atualização geral ------------------------------------
for(const btn of $('abas').children) {
 btn.addEventListener('click',()=>{
  for(const b of $('abas').children)b.classList.toggle('aba-ativa',b===btn);
  $('aba-rodadas').hidden=btn.dataset.aba!=='rodadas';
  $('aba-perguntas').hidden=btn.dataset.aba!=='perguntas';
  $('aba-lojas').hidden=btn.dataset.aba!=='lojas';
 });
}
async function atualizar() {
 estado=await chamar('estado');
 aplicarMarca(estado);
 desenharRodadas();desenharPerguntas();desenharBlocos();desenharLojas();
}
$('login').addEventListener('submit',async e=>{
 e.preventDefault();senha=$('senha-login').value;
 try {
  await atualizar();
  $('login').hidden=true;$('aplicacao').hidden=false;mensagem('');
 } catch(err) {senha='';mensagem(err.message||'Senha incorreta.');}
});
