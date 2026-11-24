-- Cliente com cargo fixo (time interno): o jogador não escolhe cargo, entra com este,
-- e o campo "loja" ganha outro nome (ex.: "setor"). Vazios = comportamento de sempre.
alter table tenant add column if not exists cargo_fixo text;
alter table tenant add column if not exists rotulo_loja text;

-- Time Metta (protocolo-metta): cargo "Time Metta", setores no lugar de lojas,
-- rodada criada por Tiago para o Time Metta.
update tenant set cargo_fixo = 'Time Metta', rotulo_loja = 'setor' where slug = 'protocolo-metta';
delete from loja where tenant_id = (select id from tenant where slug = 'protocolo-metta');
insert into loja (tenant_id, filial, rotulo)
select t.id, s.filial, s.rotulo from tenant t,
  (values ('01','Consultoria'),('02','Projetos'),('03','Marketing'),('04','Mentoria'),('05','Comercial'),('06','ADM')) as s(filial, rotulo)
where t.slug = 'protocolo-metta';
update rodada set responsavel = 'Tiago', publico = array['Time Metta']
where tenant_id = (select id from tenant where slug = 'protocolo-metta');
