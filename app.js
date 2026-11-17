let comandosSalvos = [];
let categoriasSalvas = [];
let notasSalvas = [];
let categoriaAtual = 'Todas';
let comandoSelecionadoId = null;
let idCategoriaEditando = null;
let idNotaEditando = null;
let corNotaSelecionada = 'indigo';
let modoEdicaoCmd = false;

async function verificarSessao() {
    try {
        const res = await fetch('/api/verificar');
        const data = await res.json();
        
        if (data.logado) {
            document.getElementById('loginScreen').style.display = 'none';
            iniciarApp();
        } else {
            document.getElementById('loginScreen').style.display = 'flex';
        }
    } catch (err) {
        document.getElementById('loginScreen').style.display = 'flex';
    }
}

async function fazerLogin(event) {
    event.preventDefault();
    const senha = document.getElementById('senhaInput').value;

    try {
        const res = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ senha })
        });

        if (res.ok) {
            document.getElementById('loginScreen').style.display = 'none';
            mostrarToast("Login efetuado com sucesso!");
            iniciarApp();
        } else {
            mostrarToast("Senha incorreta!", true);
        }
    } catch (err) {
        mostrarToast("Erro ao conectar com o servidor.", true);
    }
}

async function fazerLogout() {
    try {
        await fetch('/api/logout', { method: 'POST' });
        window.location.reload();
    } catch (err) {
        mostrarToast("Erro ao fazer logout.", true);
    }
}

async function iniciarApp() {
    await carregarCategorias();
    await carregarComandos();
    await carregarNotas();
}

function abrirMenu() { document.getElementById('sidebar').classList.add('open'); document.getElementById('sidebarOverlay').classList.add('show'); }
function fecharMenu() { document.getElementById('sidebar').classList.remove('open'); document.getElementById('sidebarOverlay').classList.remove('show'); }
function voltarParaLista() { document.getElementById('detailColumn').classList.remove('active-mobile'); fecharTelas(true); }

async function carregarCategorias() {
    try {
        const res = await fetch('/categorias');
        if(res.status === 401) { verificarSessao(); return; }
        categoriasSalvas = await res.json();
        renderizarSidebar();
        atualizarDropdownCategorias();
    } catch (error) { mostrarToast("Erro ao carregar categorias.", true); }
}

async function carregarComandos() {
    try {
        const res = await fetch('/comandos');
        if(res.status === 401) { verificarSessao(); return; }
        comandosSalvos = await res.json();
        renderizarSidebar();
        renderizarLista();
    } catch (error) { mostrarToast("Erro ao carregar comandos.", true); }
}

async function carregarNotas() {
    try {
        const res = await fetch('/notas');
        if(res.status === 401) return;
        notasSalvas = await res.json();
        document.getElementById('notes-total-count').innerText = notasSalvas.length;
        renderizarNotas();
    } catch (error) { console.error("Erro ao carregar notas:", error); }
}

function renderizarSidebar() {
    const menu = document.getElementById('sidebar-menu');
    menu.innerHTML = '';
    
    const btnTodas = document.createElement('button');
    btnTodas.className = `category-btn ${categoriaAtual === 'Todas' ? 'active' : ''}`;
    btnTodas.innerHTML = `
        <div class="cat-btn-left"><i class="ph ph-squares-four"></i> <span>Todas</span></div>
        <span class="cat-count">${comandosSalvos.length}</span>
    `;
    btnTodas.onclick = () => mudarCategoria('Todas');
    menu.appendChild(btnTodas);

    categoriasSalvas.forEach(cat => {
        const qtd = comandosSalvos.filter(c => c.categoria === cat.nome).length;
        const btn = document.createElement('button');
        btn.className = `category-btn ${cat.nome === categoriaAtual ? 'active' : ''}`;
        btn.innerHTML = `
            <div class="cat-btn-left"><i class="ph ${cat.icone || 'ph-folder'}"></i> <span>${cat.nome}</span></div>
            <span class="cat-count">${qtd}</span>
        `;
        btn.onclick = () => mudarCategoria(cat.nome);
        menu.appendChild(btn);
    });
}

function atualizarDropdownCategorias() {
    const select = document.getElementById('cmdCategory');
    select.innerHTML = '';
    categoriasSalvas.forEach(cat => {
        const opt = document.createElement('option');
        opt.value = cat.nome;
        opt.textContent = cat.nome;
        select.appendChild(opt);
    });
}

function mudarCategoria(catNome) {
    categoriaAtual = catNome;
    document.getElementById('btnNavNotas').classList.remove('active');
    document.getElementById('searchInput').placeholder = `Buscar em ${catNome}...`;
    document.getElementById('searchInput').value = '';
    fecharTelas(true);
    fecharMenu();
    renderizarSidebar();
    renderizarLista();
}

async function toggleFavorito(id, novoStatus, event) {
    if(event) event.stopPropagation();
    try {
        await fetch(`/comandos/${id}/favorito`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ favorito: novoStatus })
        });
        const index = comandosSalvos.findIndex(c => c.id === id);
        if (index !== -1) comandosSalvos[index].favorito = novoStatus;
        comandosSalvos.sort((a, b) => (b.favorito === true) - (a.favorito === true) || b.id - a.id);
        renderizarLista();
        if (comandoSelecionadoId === id) mostrarDetalhes(id);
    } catch (error) { mostrarToast("Erro ao favoritar.", true); }
}

function toggleFavoritoDetalhe() {
    const cmd = comandosSalvos.find(c => c.id === comandoSelecionadoId);
    if (cmd) toggleFavorito(cmd.id, !cmd.favorito);
}

function renderizarLista() {
    const container = document.getElementById('commands-list');
    const termoBusca = document.getElementById('searchInput').value.toLowerCase();
    container.innerHTML = '';

    let comandosFiltrados = categoriaAtual === 'Todas' ? comandosSalvos : comandosSalvos.filter(c => c.categoria === categoriaAtual);
    if (termoBusca) {
        comandosFiltrados = comandosFiltrados.filter(c => c.titulo.toLowerCase().includes(termoBusca) || c.codigo.toLowerCase().includes(termoBusca));
    }

    if (comandosFiltrados.length === 0) {
        container.innerHTML = `<div style="text-align:center; color:var(--text-muted); padding:20px; font-size:13px;">Nenhum comando.</div>`;
        return;
    }

    comandosFiltrados.forEach((cmd) => {
        const item = document.createElement('div');
        item.className = `cmd-item ${comandoSelecionadoId === cmd.id ? 'active' : ''}`;
        item.onclick = () => mostrarDetalhes(cmd.id);
        
        const catInfo = categoriasSalvas.find(c => c.nome === cmd.categoria);
        const icone = catInfo ? catInfo.icone : 'ph-folder';
        const iconStar = cmd.favorito ? 'ph-fill ph-star' : 'ph ph-star';
        const colorStar = cmd.favorito ? 'color: var(--fav);' : 'color: var(--text-muted);';

        item.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                <h4 style="margin: 0;"><i class="ph ${icone}" style="color:var(--primary);"></i> ${cmd.titulo}</h4>
                <button class="star-btn" style="${colorStar}" onclick="toggleFavorito(${cmd.id}, ${!cmd.favorito}, event)">
                    <i class="${iconStar}"></i>
                </button>
            </div>
            <p>${cmd.descricao || cmd.codigo}</p>
        `;
        container.appendChild(item);
    });
}

function fecharTelas(mostrarEmpty = false) {
    document.getElementById('emptyState').classList.remove('show');
    document.getElementById('viewArea').classList.remove('show');
    document.getElementById('formArea').classList.remove('show');
    document.getElementById('configArea').classList.remove('show');
    document.getElementById('notesArea').classList.remove('show');
    if(mostrarEmpty) document.getElementById('emptyState').classList.add('show');
}

function mostrarDetalhes(id) {
    comandoSelecionadoId = id;
    document.getElementById('btnNavNotas').classList.remove('active');
    fecharTelas();
    document.getElementById('viewArea').classList.add('show');
    document.getElementById('detailColumn').classList.add('active-mobile');
    renderizarLista();

    const cmd = comandosSalvos.find(c => c.id === id);
    document.getElementById('det-tag').innerText = cmd.categoria;
    document.getElementById('det-titulo').innerText = cmd.titulo;
    document.getElementById('det-desc').innerText = cmd.descricao || 'Sem descrição.';
    
    const btnFav = document.getElementById('btnFavDetalhe');
    btnFav.innerHTML = cmd.favorito ? '<i class="ph-fill ph-star"></i> Remov. Favorito' : '<i class="ph ph-star"></i> Favoritar';
    btnFav.style.color = cmd.favorito ? 'var(--fav)' : 'var(--text-main)';
    
    const codeBlock = document.getElementById('det-codigo');
    codeBlock.textContent = cmd.codigo;
    codeBlock.className = ''; 
    delete codeBlock.dataset.highlighted;
    
    const catLower = (cmd.categoria || '').toLowerCase();
    let linguagem = 'plaintext';
    if (catLower.includes('python')) linguagem = 'language-python';
    else if (catLower.includes('javascript') || catLower.includes('node')) linguagem = 'language-javascript';
    else if (catLower.includes('sql') || catLower.includes('postgres')) linguagem = 'language-sql';
    else if (catLower.includes('git') || catLower.includes('linux') || catLower.includes('docker')) linguagem = 'language-bash';
    else if (catLower.includes('html')) linguagem = 'language-html';
    else if (catLower.includes('css')) linguagem = 'language-css';
    else if (catLower.includes('json')) linguagem = 'language-json';

    codeBlock.classList.add(linguagem);
    hljs.highlightElement(codeBlock);
}

function mostrarFormulario() {
    document.getElementById('btnNavNotas').classList.remove('active');
    fecharTelas();
    document.getElementById('formArea').classList.add('show');
    document.getElementById('detailColumn').classList.add('active-mobile');
    modoEdicaoCmd = false;
    document.getElementById('form-titulo').innerHTML = `<i class="ph ph-plus-circle"></i> Adicionar Comando`;
    document.getElementById('cmdTitle').value = '';
    document.getElementById('cmdCategory').value = categoriasSalvas.length > 0 ? categoriasSalvas[0].nome : '';
    document.getElementById('cmdDesc').value = '';
    document.getElementById('cmdCode').value = '';
}

function editarComandoSelecionado() {
    fecharTelas();
    document.getElementById('formArea').classList.add('show');
    modoEdicaoCmd = true;
    const cmd = comandosSalvos.find(c => c.id === comandoSelecionadoId);
    document.getElementById('form-titulo').innerHTML = `<i class="ph ph-pencil-simple"></i> Editar Comando`;
    document.getElementById('cmdTitle').value = cmd.titulo;
    document.getElementById('cmdCategory').value = cmd.categoria;
    document.getElementById('cmdDesc').value = cmd.descricao || '';
    document.getElementById('cmdCode').value = cmd.codigo;
}

function abrirConfiguracoes() {
    document.getElementById('btnNavNotas').classList.remove('active');
    fecharTelas();
    document.getElementById('configArea').classList.add('show');
    document.getElementById('detailColumn').classList.add('active-mobile');
    fecharMenu();
    renderizarListaConfigCategorias();
}

// ================= FUNÇÕES DO BLOCO DE NOTAS =================
function abrirBlocoNotas() {
    fecharTelas();
    document.getElementById('notesArea').classList.add('show');
    document.getElementById('detailColumn').classList.add('active-mobile');
    document.getElementById('btnNavNotas').classList.add('active');
    
    // Remove o destaque das categorias
    document.querySelectorAll('#sidebar-menu .category-btn').forEach(b => b.classList.remove('active'));
    fecharMenu();
    renderizarNotas();
}

function selecionarCorNota(cor, btnElement) {
    corNotaSelecionada = cor;
    document.querySelectorAll('.color-dot').forEach(dot => dot.classList.remove('active'));
    if (btnElement) btnElement.classList.add('active');
}

function renderizarNotas() {
    const grid = document.getElementById('notes-grid');
    grid.innerHTML = '';

    if (notasSalvas.length === 0) {
        grid.innerHTML = `<p style="color: var(--text-muted); font-size: 14px; grid-column: 1/-1; text-align: center; padding: 40px;">Nenhuma anotação criada ainda. Escreva o seu primeiro lembrete acima!</p>`;
        return;
    }

    notasSalvas.forEach((nota, index) => {
        const dataFormatada = nota.criado_em ? new Date(nota.criado_em).toLocaleDateString('pt-BR') : 'Hoje';
        const card = document.createElement('div');
        card.className = 'note-card';
        card.setAttribute('data-color', nota.cor || 'indigo');
        card.style.animationDelay = `${index * 0.05}s`; // Efeito cascata animado

        card.innerHTML = `
            <div>
                <h3>${nota.titulo}</h3>
                <p>${nota.conteudo}</p>
            </div>
            <div class="note-footer">
                <span class="note-date"><i class="ph ph-calendar-blank"></i> ${dataFormatada}</span>
                <div style="display: flex; gap: 6px;">
                    <button class="btn-icon" style="padding: 6px 8px;" onclick="copiarNota(${nota.id})" title="Copiar texto"><i class="ph ph-copy"></i></button>
                    <button class="btn-icon" style="padding: 6px 8px;" onclick="editarNota(${nota.id})" title="Editar"><i class="ph ph-pencil-simple"></i></button>
                    <button class="btn-icon" style="padding: 6px 8px; color: var(--danger);" onclick="deletarNota(${nota.id})" title="Apagar"><i class="ph ph-trash"></i></button>
                </div>
            </div>
        `;
        grid.appendChild(card);
    });
}

async function salvarNota() {
    const titulo = document.getElementById('noteTitleInput').value.trim();
    const conteudo = document.getElementById('noteContentInput').value.trim();
    
    if (!titulo || !conteudo) {
        mostrarToast("Preencha o título e o conteúdo da nota!", true);
        return;
    }

    try {
        if (idNotaEditando) {
            await fetch(`/notas/${idNotaEditando}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ titulo, conteudo, cor: corNotaSelecionada })
            });
            mostrarToast("Anotação atualizada!");
        } else {
            await fetch('/notas', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ titulo, conteudo, cor: corNotaSelecionada })
            });
            mostrarToast("Anotação guardada!");
        }
        cancelarEdicaoNota();
        await carregarNotas();
    } catch (e) {
        mostrarToast("Erro ao guardar anotação.", true);
    }
}

function editarNota(id) {
    const nota = notasSalvas.find(n => n.id === id);
    if (!nota) return;

    idNotaEditando = id;
    document.getElementById('noteTitleInput').value = nota.titulo;
    document.getElementById('noteContentInput').value = nota.conteudo;
    
    const dot = document.querySelector(`.color-dot[data-color="${nota.cor || 'indigo'}"]`);
    selecionarCorNota(nota.cor || 'indigo', dot);

    document.getElementById('btnSalvarNota').innerHTML = '<i class="ph ph-floppy-disk"></i> Atualizar Nota';
    document.getElementById('btnCancelarNota').style.display = 'inline-flex';
    document.getElementById('noteTitleInput').focus();
}

function cancelarEdicaoNota() {
    idNotaEditando = null;
    document.getElementById('noteTitleInput').value = '';
    document.getElementById('noteContentInput').value = '';
    const dot = document.querySelector('.color-dot[data-color="indigo"]');
    selecionarCorNota('indigo', dot);
    document.getElementById('btnSalvarNota').innerHTML = '<i class="ph-bold ph-plus"></i> Guardar Nota';
    document.getElementById('btnCancelarNota').style.display = 'none';
}

async function deletarNota(id) {
    if (confirm("Deseja apagar esta anotação?")) {
        await fetch(`/notas/${id}`, { method: 'DELETE' });
        mostrarToast("Anotação apagada!");
        if (idNotaEditando === id) cancelarEdicaoNota();
        await carregarNotas();
    }
}

function copiarNota(id) {
    const nota = notasSalvas.find(n => n.id === id);
    if (!nota) return;
    navigator.clipboard.writeText(`${nota.titulo}\n\n${nota.conteudo}`).then(() => {
        mostrarToast("Nota copiada para a área de transferência!");
    });
}

// ================= CRUD CATEGORIAS & COMANDOS =================
function renderizarListaConfigCategorias() {
    const container = document.getElementById('config-cat-list');
    container.innerHTML = '';
    categoriasSalvas.forEach(cat => {
        container.innerHTML += `
            <div class="cat-list-item">
                <div style="display:flex; align-items:center; gap:10px;">
                    <i class="ph ${cat.icone || 'ph-folder'}" style="font-size:20px; color:var(--primary);"></i>
                    <span style="font-weight:600;">${cat.nome}</span>
                </div>
                <div style="display:flex; gap:8px;">
                    <button class="btn-icon" onclick="editarCategoria(${cat.id}, '${cat.nome}', '${cat.icone}')"><i class="ph ph-pencil"></i></button>
                    <button class="btn-icon" style="color:var(--danger);" onclick="deletarCategoria(${cat.id})"><i class="ph ph-trash"></i></button>
                </div>
            </div>
        `;
    });
}

async function salvarCategoria() {
    const nome = document.getElementById('catNameInput').value;
    const icone = document.getElementById('catIconInput').value;
    if(!nome) { mostrarToast("O nome é obrigatório", true); return; }

    try {
        if (idCategoriaEditando) {
            await fetch(`/categorias/${idCategoriaEditando}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nome, icone }) });
            mostrarToast("Categoria atualizada!");
        } else {
            await fetch('/categorias', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nome, icone }) });
            mostrarToast("Categoria adicionada!");
        }
        cancelarEdicaoCategoria();
        await carregarCategorias();
        abrirConfiguracoes();
    } catch (e) { mostrarToast("Erro ao salvar", true); }
}

function editarCategoria(id, nome, icone) {
    idCategoriaEditando = id;
    document.getElementById('catNameInput').value = nome;
    document.getElementById('catIconInput').value = icone;
    document.getElementById('btnSalvarCat').innerHTML = '<i class="ph ph-floppy-disk"></i>';
    document.getElementById('btnCancelarCat').style.display = 'block';
}

function cancelarEdicaoCategoria() {
    idCategoriaEditando = null;
    document.getElementById('catNameInput').value = '';
    document.getElementById('catIconInput').value = 'ph-folder';
    document.getElementById('btnSalvarCat').innerHTML = '<i class="ph ph-plus-circle"></i>';
    document.getElementById('btnCancelarCat').style.display = 'none';
}

async function deletarCategoria(id) {
    if(confirm("Deseja apagar esta categoria?")) {
        await fetch(`/categorias/${id}`, { method: 'DELETE' });
        mostrarToast("Categoria deletada!");
        await carregarCategorias();
        abrirConfiguracoes();
    }
}

async function salvarComando() {
    const titulo = document.getElementById('cmdTitle').value;
    const categoria = document.getElementById('cmdCategory').value;
    const descricao = document.getElementById('cmdDesc').value;
    const codigo = document.getElementById('cmdCode').value;
    if (!titulo || !codigo) { mostrarToast("Preencha título e comando!", true); return; }

    const payload = { titulo, categoria, descricao, codigo };
    try {
        let savedId = comandoSelecionadoId;
        if (modoEdicaoCmd) {
            const res = await fetch(`/comandos/${comandoSelecionadoId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
            if (!res.ok) { const errorData = await res.json(); mostrarToast(errorData.error || "Erro.", true); return; }
            mostrarToast("Comando atualizado!");
        } else {
            const res = await fetch('/comandos', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
            if (!res.ok) { const errorData = await res.json(); mostrarToast(errorData.error || "Erro.", true); return; }
            const novoCmd = await res.json(); savedId = novoCmd.id;
            mostrarToast("Comando salvo!");
        }
        await carregarComandos();
        mostrarDetalhes(savedId);
    } catch (error) { mostrarToast("Erro ao conectar.", true); }
}

async function deletarComandoSelecionado() {
    if(confirm("Tem certeza que deseja excluir?")) {
        await fetch(`/comandos/${comandoSelecionadoId}`, { method: 'DELETE' });
        mostrarToast("Excluído!");
        comandoSelecionadoId = null;
        await carregarComandos();
        voltarParaLista();
    }
}

async function processarImportacao(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async function(e) {
        try {
            const comandosImportados = JSON.parse(e.target.result);
            if (!Array.isArray(comandosImportados)) { mostrarToast("Erro: JSON inválido.", true); return; }
            mostrarToast(`A importar...`);
            
            let sucessoCount = 0; let duplicadosCount = 0;
            for (const cmd of comandosImportados) {
                try {
                    const res = await fetch('/comandos', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ 
                            titulo: cmd.titulo, 
                            categoria: cmd.categoria, 
                            descricao: cmd.descricao || '', 
                            codigo: cmd.codigo,
                            favorito: cmd.favorito || false 
                        })
                    });
                    if (res.ok) sucessoCount++; else duplicadosCount++;
                } catch (err) {}
            }
            let msgFinal = `${sucessoCount} importados!`;
            if (duplicadosCount > 0) msgFinal += ` (${duplicadosCount} repetidos).`;
            mostrarToast(msgFinal);
            document.getElementById('importInput').value = '';
            await carregarComandos();
            voltarParaLista();
        } catch (error) { mostrarToast("Erro ao ler o JSON.", true); }
    };
    reader.readAsText(file);
}

async function exportarBackup() {
    try {
        const response = await fetch('/api/exportar');
        if (!response.ok) {
            mostrarToast("Erro ao gerar backup.", true);
            return;
        }

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `backup-comandos-${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        
        mostrarToast("Backup exportado com sucesso!");
    } catch (error) {
        mostrarToast("Erro ao conectar com o servidor.", true);
    }
}

function copiarCodigo() {
    navigator.clipboard.writeText(document.getElementById('det-codigo').textContent).then(() => {
        const btn = document.getElementById('btnCopy');
        btn.innerHTML = `<i class="ph-fill ph-check-circle"></i> Copiado`;
        btn.classList.add('copied');
        mostrarToast("Código copiado!");
        setTimeout(() => { btn.innerHTML = `<i class="ph ph-copy"></i> Copiar`; btn.classList.remove('copied'); }, 2000);
    });
}

let toastTimeout;
function mostrarToast(mensagem, isError = false) {
    const toast = document.getElementById('toast');
    toast.style.backgroundColor = isError ? 'var(--danger)' : 'var(--success)';
    toast.innerHTML = isError ? `<i class="ph-fill ph-warning-circle"></i> ${mensagem}` : `<i class="ph-fill ph-check-circle"></i> ${mensagem}`;
    toast.classList.add('show');
    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => { toast.classList.remove('show'); }, 4000);
}

verificarSessao();