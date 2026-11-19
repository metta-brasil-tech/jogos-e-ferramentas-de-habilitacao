-- Frase curta acima do título na tela de entrada do jogo, por cliente.
-- Vazia = mantém a frase padrão do HTML ("VENDA 4.0 E PRODUTOS").
alter table tenant add column if not exists sobretitulo text;
update tenant set sobretitulo = 'PROTOCOLO M.E.T.T.A' where slug = 'protocolo-metta';
