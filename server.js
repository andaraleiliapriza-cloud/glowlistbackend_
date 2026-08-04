const express = require('express');
const mysql = require('mysql2');
const app = express();
const PORT = 3001;

app.use(express.json());
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'glowlist_db'
});

db.connect(err => {
  if (err) {
    console.error('Gagal konek ke database:', err);
  } else {
    console.log('Berhasil konek ke database Glowlist');
  }
});

app.get('/', (req, res) => {
    res.send('Selamat Datangg di GlowList APIIIII-!!!!');
});

app.get('/produk', (req, res) => {
    const sql = 'SELECT * FROM produk';
    db.query(sql, (err, result) => {
        if (err) return res.status(500).json({ error: err });
        res.json(result);
    });
});

app.get('/kategori', (req, res) => {
    const sql = 'SELECT * FROM kategori';
    db.query(sql, (err, result) => {
        if (err) return res.status(500).json({ error: err });
        res.json(result);
    });
});

app.listen(PORT, () => {
    console.log(`Server GlowList jalan di http://localhost:${PORT}`);
});