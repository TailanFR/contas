// ========================================================
// FRONT-END APP LOGIC
// ========================================================

const API_URL = 'https://script.google.com/macros/s/AKfycbwI8VSNRmMDbjQpi0Eafcp7DFO5v4s71pIqFs1hMLS458LWgBYcUuDnQzZTMkABBu69Xw/exec';
let selectedType = 'Despesa';
let formOptions = { receitasCategorias: [], despesasCategorias: [], cartoes: [], formasPagamento: [] };

document.addEventListener('DOMContentLoaded', () => {
  initNav();
  initForm();
  document.getElementById('inp-data').value = new Date().toISOString().split('T')[0];
  
  if (API_URL) {
    document.getElementById('inp-api-url').value = API_URL;
    loadAllData();
  } else {
    showTab('tab-config');
    showToast('Configure a URL da API para começar');
  }
});

// Navegação por Abas
function initNav() {
  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      showTab(btn.dataset.tab);
    });
  });
}

function showTab(tabId) {
  document.querySelectorAll('.tab-content').forEach(tc => tc.classList.remove('active'));
  document.getElementById(tabId).classList.add('active');
}

// Configuração do Formulário
function initForm() {
  document.querySelectorAll('.btn-type').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.btn-type').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      selectedType = btn.dataset.type;
      updateCategoryDropdown();
    });
  });

  document.getElementById('inp-forma').addEventListener('change', (e) => {
    const isCredito = e.target.value === 'Credito';
    document.getElementById('group-cartao').style.display = isCredito ? 'block' : 'none';
    document.getElementById('group-parcelas').style.display = isCredito ? 'flex' : 'none';
  });

  document.getElementById('form-lancamento').addEventListener('submit', handleFormSubmit);
  document.getElementById('btn-save-config').addEventListener('click', saveConfig);
  document.getElementById('btn-refresh').addEventListener('click', loadAllData);
}

function saveConfig() {
  const url = document.getElementById('inp-api-url').value.trim();
  if (url) {
    localStorage.setItem('API_URL', url);
    API_URL = url;
    showToast('URL salva com sucesso!');
    loadAllData();
    showTab('tab-dashboard');
  }
}

async function loadAllData() {
  if (!API_URL) return;
  showToast('Atualizando dados...');
  await Promise.all([fetchDashboard(), fetchFormOptions(), fetchLancamentos()]);
}

async function fetchDashboard() {
  try {
    const res = await fetch(`${API_URL}?action=getDashboard`);
    const json = await res.json();
    if (json.status === 'success') {
      const d = json.data;
      document.getElementById('dash-saldo').innerText = formatBRL(d.saldoMes);
      document.getElementById('dash-receitas').innerText = formatBRL(d.receitasMes);
      document.getElementById('dash-despesas').innerText = formatBRL(d.despesasMes);
      document.getElementById('dash-fixas').innerText = formatBRL(d.contasFixasTotal);
      document.getElementById('dash-media').innerText = formatBRL(d.mediaSobra);
      document.getElementById('dash-meta').innerText = formatBRL(d.metaSobra);
      document.getElementById('dash-meses').innerText = d.mesesAteMeta;
    }
  } catch (err) {
    console.error('Erro ao carregar Dashboard:', err);
  }
}

async function fetchFormOptions() {
  try {
    const res = await fetch(`${API_URL}?action=getFormOptions`);
    const json = await res.json();
    if (json.status === 'success') {
      formOptions = json.data;
      updateCategoryDropdown();
      populateSelect('inp-forma', formOptions.formasPagamento);
      populateSelect('inp-cartao', formOptions.cartoes);
    }
  } catch (err) {
    console.error('Erro ao carregar Opções:', err);
  }
}

function updateCategoryDropdown() {
  const list = selectedType === 'Receita' ? formOptions.receitasCategorias : formOptions.despesasCategorias;
  populateSelect('inp-categoria', list);
}

function populateSelect(id, list) {
  const sel = document.getElementById(id);
  sel.innerHTML = list.map(item => `<option value="${item}">${item}</option>`).join('');
}

async function fetchLancamentos() {
  try {
    const res = await fetch(`${API_URL}?action=getLancamentos&limit=30`);
    const json = await res.json();
    if (json.status === 'success') {
      renderLancamentos(json.data);
    }
  } catch (err) {
    console.error('Erro ao buscar lançamentos:', err);
  }
}

function renderLancamentos(list) {
  const container = document.getElementById('lista-lancamentos');
  if (!list || list.length === 0) {
    container.innerHTML = '<p class="empty-msg">Nenhum lançamento encontrado.</p>';
    return;
  }

  container.innerHTML = list.map(item => `
    <div class="item-row">
      <div class="item-left">
        <h4>${item.descricao}</h4>
        <p>${item.data} • ${item.categoria} ${item.cartao ? '(' + item.cartao + ')' : ''}</p>
      </div>
      <div class="item-right">
        <span class="item-val ${item.tipo}">${item.tipo === 'Despesa' ? '-' : '+'}${formatBRL(item.valor)}</span>
      </div>
    </div>
  `).join('');
}

async function handleFormSubmit(e) {
  e.preventDefault();
  const btn = document.getElementById('btn-salvar');
  btn.disabled = true;
  btn.innerText = 'Salvando...';

  const payload = {
    tipo: selectedType,
    valor: parseFloat(document.getElementById('inp-valor').value),
    descricao: document.getElementById('inp-descricao').value,
    categoria: document.getElementById('inp-categoria').value,
    forma: document.getElementById('inp-forma').value,
    cartao: document.getElementById('inp-cartao').value,
    parcelaAtual: document.getElementById('inp-parc-atual').value,
    totalParcelas: document.getElementById('inp-parc-total').value,
    data: document.getElementById('inp-data').value
  };

  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: 'addLancamento', payload })
    });
    const json = await res.json();
    if (json.status === 'success') {
      showToast('Lançamento salvo!');
      document.getElementById('inp-valor').value = '';
      document.getElementById('inp-descricao').value = '';
      loadAllData();
      showTab('tab-dashboard');
    } else {
      showToast('Erro: ' + json.message);
    }
  } catch (err) {
    showToast('Erro de conexão ao salvar');
  } finally {
    btn.disabled = false;
    btn.innerText = 'Salvar Lançamento';
  }
}

function formatBRL(val) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);
}

function showToast(msg) {
  const toast = document.getElementById('toast');
  toast.innerText = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 3000);
}

// Service Worker para PWA
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').catch(err => console.log('SW reg error:', err));
}
