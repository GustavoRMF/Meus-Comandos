require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
app.use(cors());
app.use(express.json());

// Exibe o teu index.html automaticamente
app.use(express.static(__dirname)); 

// Conexão com o banco Neon
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

// Buscar todos os comandos
app.get('/comandos', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM comandos ORDER BY id DESC');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Criar comando
app.post('/comandos', async (req, res) => {
    const { titulo, categoria, descricao, codigo } = req.body;
    try {
        const result = await pool.query(
            'INSERT INTO comandos (titulo, categoria, descricao, codigo) VALUES ($1, $2, $3, $4) RETURNING *',
            [titulo, categoria, descricao, codigo]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Atualizar comando
app.put('/comandos/:id', async (req, res) => {
    const { id } = req.params;
    const { titulo, categoria, descricao, codigo } = req.body;
    try {
        const result = await pool.query(
            'UPDATE comandos SET titulo = $1, categoria = $2, descricao = $3, codigo = $4 WHERE id = $5 RETURNING *',
            [titulo, categoria, descricao, codigo, id]
        );
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Apagar comando
app.delete('/comandos/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query('DELETE FROM comandos WHERE id = $1', [id]);
        res.json({ message: 'Comando deletado' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});