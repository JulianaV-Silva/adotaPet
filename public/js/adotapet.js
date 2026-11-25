
document.addEventListener('DOMContentLoaded', () => {
  marcarLinkAtivo();
  iniciarFiltros();
  iniciarPreviewDeFoto();
  carregarDestaques();
});

function marcarLinkAtivo() {
  const caminho = window.location.pathname;

  document.querySelectorAll('.ap-nav .nav-link').forEach((link) => {
    const destino = link.getAttribute('href');
    const ativo = destino === '/'
      ? caminho === '/'
      : caminho === destino;

    if (ativo) {
      link.classList.add('ativo');
      link.setAttribute('aria-current', 'page');
    }
  });
}

function iniciarFiltros() {
  const lista = document.querySelector('[data-lista-animais]');
  if (!lista) return;

  const busca = document.getElementById('filtroBusca');
  const especie = document.getElementById('filtroEspecie');
  const idade = document.getElementById('filtroIdade');
  const status = document.getElementById('filtroStatus');
  const limpar = document.getElementById('filtroLimpar');
  const contador = document.getElementById('filtroContador');
  const semResultado = document.getElementById('semResultado');
  const cards = Array.from(lista.querySelectorAll('[data-animal]'));

  const parametros = new URLSearchParams(window.location.search);
  if (parametros.get('especie')) especie.value = parametros.get('especie');
  if (parametros.get('idade')) idade.value = parametros.get('idade');
  if (parametros.get('busca')) busca.value = parametros.get('busca');

  function faixaDeIdade(anos) {
    if (anos <= 1) return 'filhote';
    if (anos <= 7) return 'adulto';
    return 'idoso';
  }

  function normalizar(texto) {
    return texto
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '');
  }

  function aplicar() {
    const termo = normalizar(busca.value.trim());
    let visiveis = 0;

    cards.forEach((card) => {
      const d = card.dataset;
      const ok =
        (!termo || normalizar(d.nome).includes(termo)) &&
        (!especie.value || d.especie === especie.value) &&
        (!idade.value || faixaDeIdade(Number(d.idade)) === idade.value) &&
        (!status.value || d.status === status.value);

      card.classList.toggle('ap-oculto', !ok);
      if (ok) visiveis++;
    });

    [especie, idade, status].forEach((campo) => {
      campo.classList.toggle('ativo', Boolean(campo.value));
    });

    const filtrando = termo || especie.value || idade.value || status.value;
    limpar.classList.toggle('ap-oculto', !filtrando);

    if (contador) {
      contador.textContent = visiveis === 1
        ? '1 animal encontrado'
        : `${visiveis} animais encontrados`;
    }

    if (semResultado) {
      semResultado.classList.toggle('ap-oculto', visiveis > 0 || cards.length === 0);
    }
  }

  [busca, especie, idade, status].forEach((campo) => {
    campo.addEventListener('input', aplicar);
  });

  limpar.addEventListener('click', () => {
    busca.value = '';
    especie.value = '';
    idade.value = '';
    status.value = '';
    aplicar();
    busca.focus();
  });

  aplicar();
}

function iniciarPreviewDeFoto() {
  document.querySelectorAll('input[type="file"][data-preview]').forEach((input) => {
    const alvo = document.getElementById(input.dataset.preview);
    if (!alvo) return;

    input.addEventListener('change', () => {
      const arquivo = input.files && input.files[0];
      if (!arquivo || !arquivo.type.startsWith('image/')) return;

      alvo.src = URL.createObjectURL(arquivo);
      alvo.classList.remove('ap-oculto');
    });
  });
}

async function buscarAnimaisCadastrados() {
  const resposta = await fetch('/animais', { credentials: 'same-origin' });
  if (!resposta.ok) return [];

  const pagina = new DOMParser().parseFromString(await resposta.text(), 'text/html');
  return Array.from(pagina.querySelectorAll('[data-animal]'));
}

async function carregarDestaques() {
  const secao = document.querySelector('[data-destaques]');
  const espacos = document.querySelectorAll('[data-foto-pet]');
  if (!secao && espacos.length === 0) return;

  let cards = [];
  try {
    cards = await buscarAnimaisCadastrados();
  } catch (erro) {
    return; 
  }

  const disponiveis = cards.filter((c) => c.dataset.status === 'disponivel');
  const ordenados = disponiveis.concat(cards.filter((c) => c.dataset.status !== 'disponivel'));

  const fotos = ordenados
    .map((c) => c.querySelector('img'))
    .filter(Boolean)
    .map((img) => img.getAttribute('src'));

  if (fotos.length > 0) {
    espacos.forEach((espaco) => {
      const indice = Number(espaco.dataset.fotoPet) || 0;
      const img = document.createElement('img');
      img.src = fotos[indice % fotos.length];
      img.alt = '';
      espaco.appendChild(img);
      espaco.classList.add('preenchido');
    });
  }

  if (!secao || disponiveis.length === 0) return;

  const lista = secao.querySelector('[data-destaques-lista]');

  disponiveis.slice(0, 4).forEach((card, indice) => {
    card.querySelector('.ap-card-acoes')?.remove();

    const link = card.querySelector('.ap-pet-card');
    link.className = link.className.replace(/ap-cor-\d+/, 'ap-cor-' + indice);

    lista.appendChild(document.importNode(card, true));
  });

  secao.hidden = false;
}
