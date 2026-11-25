export const porId = (id) => document.getElementById(id);
export const formatarPontos = (pontos) => pontos.toLocaleString('pt-BR');
export const LETRAS = ['A', 'B', 'C', 'D'];

const entidades = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

// Apelidos e alternativas entram como texto mesmo quando contêm caracteres de HTML.
export function escaparHtml(valor) {
  return String(valor ?? '').replace(/[&<>"']/g, (caractere) => entidades[caractere]);
}
