// Markdown mínimo del asistente: **negrita**, *cursiva*, `código` y listas
// con guion o numeradas. El texto se escapa ANTES de insertar las etiquetas,
// así que nada de lo que devuelve el modelo se interpreta: ni etiquetas ni
// atributos (un intento de inyección se ve como texto).
//
// Vive fuera de ChatWidget para poder testearlo con Node sin DOM.
(function (root) {
  'use strict';

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function inlineMd(str) {
    return str
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/(^|\s)\*([^*\s][^*]*)\*/g, '$1<em>$2</em>');
  }

  function mdToHtml(text) {
    var out = [];
    var lista = null; // 'ul' | 'ol' mientras haya una lista abierta

    function cerrarLista() {
      if (lista) {
        out.push('</' + lista + '>');
        lista = null;
      }
    }

    escapeHtml(text || '').split('\n').forEach(function (linea) {
      var vineta = linea.match(/^\s*[-*•]\s+(.*)$/);
      var numerada = vineta ? null : linea.match(/^\s*\d+[.)]\s+(.*)$/);

      if (vineta || numerada) {
        var tipo = vineta ? 'ul' : 'ol';
        if (lista !== tipo) {
          cerrarLista();
          out.push('<' + tipo + '>');
          lista = tipo;
        }
        out.push('<li>' + inlineMd(vineta ? vineta[1] : numerada[1]) + '</li>');
        return;
      }

      cerrarLista();
      var limpia = linea.replace(/^\s+/, '');
      if (!limpia) {
        out.push('\n');
        return;
      }
      // Los encabezados no se usan en el chat: si aparecen, van en negrita.
      var sinTitulo = limpia.replace(/^#{1,6}\s+/, '');
      var cuerpo = inlineMd(sinTitulo);
      out.push((sinTitulo === limpia ? cuerpo : '<strong>' + cuerpo + '</strong>') + '\n');
    });

    cerrarLista();
    // Sin saltos de sobra al principio ni al final (el globo usa pre-wrap).
    return out.join('').replace(/^\n+/, '').replace(/\n+$/, '');
  }

  root.MagicOS = root.MagicOS || {};
  root.MagicOS.markdown = {
    escapeHtml: escapeHtml,
    inlineMd: inlineMd,
    mdToHtml: mdToHtml
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { escapeHtml: escapeHtml, inlineMd: inlineMd, mdToHtml: mdToHtml };
  }
})(typeof window !== 'undefined' ? window : globalThis);
