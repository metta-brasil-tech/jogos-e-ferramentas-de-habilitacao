-- Logo por bloco de perguntas: o consultor anexa a logo do cliente ao criar o bloco e ela
-- aparece durante o jogo (junto da logo da Metta). Um bloco existe aqui mesmo sem perguntas.
create table if not exists bloco_config (
  tenant_id uuid not null references tenant(id) on delete cascade,
  nome      text not null,
  logo_url  text,
  criado_em timestamptz not null default now(),
  primary key (tenant_id, nome)
);
alter table bloco_config enable row level security;  -- sem policy: só a Edge Function (service role) acessa

-- Bucket público só para leitura das logos; o envio é feito pela Edge Function.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('logos', 'logos', true, 2097152, array['image/png','image/jpeg','image/webp'])
on conflict (id) do update set public = true, file_size_limit = 2097152,
  allowed_mime_types = array['image/png','image/jpeg','image/webp'];
