require('dotenv').config();
const express = require('express');
const session = require('express-session');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
app.use(cors());
app.use(express.json());

// Configuração da Sessão do Navegador
app.use(session({
    secret: process.env.SESSION_SECRET || 'segredo_super_secreto_comandos',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 30 * 24 * 60 * 60 * 1000 } // Dura 30 dias logado
}));

app.use(express.static(__dirname)); 

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

// Senha de Acesso (Defina no Render ou use '123456' como padrão)
const SENHA_MESTRE = process.env.SENHA_MESTRE || '19941205';

// ==========================================
// PORTÃO DE SEGURANÇA (MIDDLEWARE)
// ==========================================
function verificarAuth(req, res, next) {
    if (req.session && req.session.logado) {
        return next(); // Pode passar
    }
    res.status(401).json({ error: 'Não autorizado. Faça login primeiro.' });
}

// ==========================================
// ROTAS DE AUTENTICAÇÃO
// ==========================================
app.post('/api/login', (req, res) => {
    const { senha } = req.body;
    if (senha === SENHA_MESTRE) {
        req.session.logado = true;
        res.json({ success: true, message: 'Login bem-sucedido!' });
    } else {
        res.status(401).json({ error: 'Senha incorreta!' });
    }
});

app.get('/api/verificar', (req, res) => {
    if (req.session && req.session.logado) {
        res.json({ logado: true });
    } else {
        res.json({ logado: false });
    }
});

app.post('/api/logout', (req, res) => {
    req.session.destroy();
    res.json({ success: true });
});

// ==========================================
// ROTAS DE COMANDOS (Protegidas pelo verificarAuth)
// ==========================================
app.get('/comandos', verificarAuth, async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM comandos ORDER BY favorito DESC, id DESC');
        res.json(result.rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/comandos', verificarAuth, async (req, res) => {
    const { titulo, categoria, descricao, codigo } = req.body;
    try {
        const checkDuplicata = await pool.query(
            'SELECT id FROM comandos WHERE titulo = $1 OR codigo = $2',
            [titulo, codigo]
        );
        if (checkDuplicata.rows.length > 0) {
            return res.status(400).json({ error: 'Este Título ou Código já está salvo!' });
        }
        const result = await pool.query(
            'INSERT INTO comandos (titulo, categoria, descricao, codigo) VALUES ($1, $2, $3, $4) RETURNING *',
            [titulo, categoria, descricao, codigo]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/comandos/:id', verificarAuth, async (req, res) => {
    const { id } = req.params;
    const { titulo, categoria, descricao, codigo } = req.body;
    try {
        const result = await pool.query(
            'UPDATE comandos SET titulo = $1, categoria = $2, descricao = $3, codigo = $4 WHERE id = $5 RETURNING *',
            [titulo, categoria, descricao, codigo, id]
        );
        res.json(result.rows[0]);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.patch('/comandos/:id/favorito', verificarAuth, async (req, res) => {
    const { id } = req.params;
    const { favorito } = req.body;
    try {
        const result = await pool.query(
            'UPDATE comandos SET favorito = $1 WHERE id = $2 RETURNING *',
            [favorito, id]
        );
        res.json(result.rows[0]);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/comandos/:id', verificarAuth, async (req, res) => {
    try {
        await pool.query('DELETE FROM comandos WHERE id = $1', [req.params.id]);
        res.json({ message: 'Comando deletado' });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// ==========================================
// ROTAS DE CATEGORIAS (Protegidas pelo verificarAuth)
// ==========================================
app.get('/categorias', verificarAuth, async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM categorias ORDER BY id ASC');
        res.json(result.rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/categorias', verificarAuth, async (req, res) => {
    const { nome, icone } = req.body;
    try {
        const result = await pool.query(
            'INSERT INTO categorias (nome, icone) VALUES ($1, $2) RETURNING *',
            [nome, icone || 'ph-folder']
        );
        res.status(201).json(result.rows[0]);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/categorias/:id', verificarAuth, async (req, res) => {
    const { id } = req.params;
    const { nome, icone } = req.body;
    try {
        const result = await pool.query(
            'UPDATE categorias SET nome = $1, icone = $2 WHERE id = $3 RETURNING *',
            [nome, icone || 'ph-folder', id]
        );
        res.json(result.rows[0]);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/categorias/:id', verificarAuth, async (req, res) => {
    try {
        await pool.query('DELETE FROM categorias WHERE id = $1', [req.params.id]);
        res.json({ message: 'Categoria deletada' });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});