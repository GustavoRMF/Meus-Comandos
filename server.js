require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
app.use(cors());
app.use(express.json());

app.use(express.static(__dirname)); 

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

// ==========================================
// ROTAS DE COMANDOS
// ==========================================
app.get('/comandos', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM comandos ORDER BY id DESC');
        res.json(result.rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/comandos', async (req, res) => {
    const { titulo, categoria, descricao, codigo } = req.body;
    try {
        const result = await pool.query(
            'INSERT INTO comandos (titulo, categoria, descricao, codigo) VALUES ($1, $2, $3, $4) RETURNING *',
            [titulo, categoria, descricao, codigo]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/comandos/:id', async (req, res) => {
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

app.delete('/comandos/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM comandos WHERE id = $1', [req.params.id]);
        res.json({ message: 'Comando deletado' });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// ==========================================
// ROTAS DE CATEGORIAS (NOVO)
// ==========================================
app.get('/categorias', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM categorias ORDER BY id ASC');
        res.json(result.rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/categorias', async (req, res) => {
    const { nome, icone } = req.body;
    try {
        const result = await pool.query(
            'INSERT INTO categorias (nome, icone) VALUES ($1, $2) RETURNING *',
            [nome, icone || 'ph-folder']
        );
        res.status(201).json(result.rows[0]);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/categorias/:id', async (req, res) => {
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

app.delete('/categorias/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM categorias WHERE id = $1', [req.params.id]);
        res.json({ message: 'Categoria deletada' });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});