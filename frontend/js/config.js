export const SUPABASE_URL = "https://rcmspjlocnuugcsfzles.supabase.co";
export const SUPABASE_KEY = "sb_publishable_l22yITYLod8mBjxNnK3BFA_LkQj1MIZ";
export const API = SUPABASE_URL + "/functions/v1/api";
// Todo cliente é resolvido por "?c=slug" na URL (criado pela tela /clientes.html, sem
// precisar de deploy de arquivo — a marca vem toda do /config em tempo real, ver
// aplicarMarca() em cliente.js). CLIENTES_CONHECIDOS só serve se um dia alguém criar uma
// subpasta própria pra um cliente (ex.: /nome-do-cliente/); hoje não tem nenhuma.
const CLIENTES_CONHECIDOS = [];
const segmentos = (globalThis.location?.pathname ?? "").split("/").filter(Boolean);
const paramC = new URLSearchParams(globalThis.location?.search ?? "").get("c");
export const CLIENTE = paramC || segmentos.find((s) => CLIENTES_CONHECIDOS.includes(s)) || "";
