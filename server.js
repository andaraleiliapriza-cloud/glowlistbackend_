const express = require('express');
const cors = require('cors');
const mysql = require('mysql2');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const authJWT = require('./middleware');
const path = require('path');
const multer = require('multer');

const app = express();
const PORT = 3001;

// ===============================
// MIDDLEWARE
// ===============================
app.use(cors());
app.use(express.json());

// Folder upload
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// ===============================
// MULTER
// ===============================
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        const uniqueSuffix =
            Date.now() + '-' + Math.round(Math.random() * 1e9);

        cb(null, uniqueSuffix + '-' + file.originalname);
    }
});

const upload = multer({ storage: storage });

// ===============================
// DATABASE
// ===============================
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'glowlist_db'
});

db.connect((err) => {
    if (err) {
        console.error('Gagal konek ke database:', err);
    } else {
        console.log('Berhasil konek ke database Glowlist');
    }
});

// ===============================
// ROUTE UTAMA
// ===============================
app.get('/', (req, res) => {
    res.send('Selamat Datang di GlowList API!');
});

// ===============================
// GET PRODUK
// ===============================
app.get('/produk', (req, res) => {
    const sql = 'SELECT * FROM produk';

    db.query(sql, (err, result) => {
        if (err) {
            console.error('Error GET /produk:', err);

            return res.status(500).json({
                message: 'Gagal mengambil data produk',
                error: err.sqlMessage
            });
        }

        res.status(200).json(result);
    });
});

// ===============================
// GET KATEGORI
// ===============================
app.get('/kategori', (req, res) => {
    const sql = 'SELECT * FROM kategori';

    db.query(sql, (err, result) => {
        if (err) {
            console.error('Error GET /kategori:', err);

            return res.status(500).json({
                message: 'Gagal mengambil data kategori',
                error: err.sqlMessage
            });
        }

        res.status(200).json(result);
    });
});

// ===============================
// GET PRODUK BERDASARKAN ID
// ===============================
app.get('/produk/:id_produk', (req, res) => {
    const { id_produk } = req.params;

    const sql = 'SELECT * FROM produk WHERE id_produk = ?';

    db.query(sql, [id_produk], (err, result) => {
        if (err) {
            return res.status(500).json({
                message: 'Gagal mengambil data produk',
                error: err.sqlMessage
            });
        }

        if (result.length === 0) {
            return res.status(404).json({
                message: 'Produk tidak ditemukan'
            });
        }

        res.json(result);
    });
});

// ===============================
// TAMBAH PRODUK
// ===============================
app.post('/produk', upload.single('file'), (req, res) => {
    console.log('BODY:', req.body);
    console.log('FILE:', req.file);

    const {
        judul,
        deskripsi,
        harga,
        id_kategori
    } = req.body;

    const nama_file = req.file
        ? req.file.filename
        : null;

    // Validasi judul dan harga
    if (!judul || !harga) {
        return res.status(400).json({
            message: 'Judul dan harga wajib diisi'
        });
    }

    // Validasi deskripsi
    if (!deskripsi) {
        return res.status(400).json({
            message: 'Deskripsi wajib diisi'
        });
    }

    const sql = `
        INSERT INTO produk
        (judul, deskripsi, harga, id_kategori, nama_file, tgl_input)
        VALUES (?, ?, ?, ?, ?, NOW())
    `;

    db.query(
        sql,
        [
            judul,
            deskripsi,
            harga,
            id_kategori,
            nama_file
        ],
        (err, result) => {

            if (err) {
                console.error('Error POST /produk:', err);

                return res.status(500).json({
                    message: 'Gagal menambahkan produk',
                    error: err.sqlMessage
                });
            }

            res.status(201).json({
                message: 'Produk berhasil ditambahkan!',
                id_produk: result.insertId
            });
        }
    );
});

// ===============================
// UPDATE PRODUK
// ===============================
app.put(
    '/produk/:id_produk',
    authJWT,
    upload.single('file'),
    (req, res) => {

        const { id_produk } = req.params;

        const {
            judul,
            deskripsi,
            harga,
            id_kategori
        } = req.body;

        // Cari produk lama
        const sqlSelect =
            'SELECT * FROM produk WHERE id_produk = ?';

        db.query(
            sqlSelect,
            [id_produk],
            (err, result) => {

                if (err) {
                    return res.status(500).json({
                        message: 'Gagal mengambil produk',
                        error: err.sqlMessage
                    });
                }

                if (result.length === 0) {
                    return res.status(404).json({
                        message: 'Produk tidak ditemukan'
                    });
                }

                // Nama file lama
                const nama_file_lama =
                    result[0].nama_file;

                // Jika ada foto baru gunakan foto baru
                // Jika tidak, gunakan foto lama
                const nama_file = req.file
                    ? req.file.filename
                    : nama_file_lama;

                const sqlUpdate = `
                    UPDATE produk
                    SET judul = ?,
                        deskripsi = ?,
                        harga = ?,
                        id_kategori = ?,
                        nama_file = ?
                    WHERE id_produk = ?
                `;

                db.query(
                    sqlUpdate,
                    [
                        judul,
                        deskripsi,
                        harga,
                        id_kategori,
                        nama_file,
                        id_produk
                    ],
                    (err, result) => {

                        if (err) {
                            return res.status(500).json({
                                message: 'Gagal mengupdate produk',
                                error: err.sqlMessage
                            });
                        }

                        if (result.affectedRows === 0) {
                            return res.status(404).json({
                                message: 'Produk tidak ditemukan'
                            });
                        }

                        res.json({
                            message: 'Produk berhasil diupdate!',
                            nama_file: nama_file
                        });
                    }
                );
            }
        );
    }
);

// ===============================
// DELETE PRODUK
// ===============================
app.delete(
    '/produk/:id_produk',
    authJWT,
    (req, res) => {

        const { id_produk } = req.params;

        const sql =
            'DELETE FROM produk WHERE id_produk = ?';

        db.query(
            sql,
            [id_produk],
            (err, result) => {

                if (err) {
                    return res.status(500).json({
                        message: 'Gagal menghapus produk',
                        error: err.sqlMessage
                    });
                }

                if (result.affectedRows === 0) {
                    return res.status(404).json({
                        message: 'Produk tidak ditemukan'
                    });
                }

                res.json({
                    message: 'Produk berhasil dihapus!'
                });
            }
        );
    }
);

// ===============================
// REGISTER PENGGUNA
// ===============================
app.post('/pengguna', async (req, res) => {

    const {
        nama,
        email,
        password
    } = req.body;

    if (!nama || !email || !password) {
        return res.status(400).json({
            message: 'Nama, email, dan password wajib diisi'
        });
    }

    try {

        const hashedPassword =
            await bcrypt.hash(password, 10);

        const sql = `
            INSERT INTO pengguna
            (nama, email, password)
            VALUES (?, ?, ?)
        `;

        db.query(
            sql,
            [
                nama,
                email,
                hashedPassword
            ],
            (err, result) => {

                if (err) {

                    if (err.code === 'ER_DUP_ENTRY') {
                        return res.status(400).json({
                            message:
                                'Email sudah terdaftar, gunakan email lain'
                        });
                    }

                    return res.status(500).json({
                        message:
                            'Gagal mendaftarkan pengguna',
                        error: err.sqlMessage
                    });
                }

                res.status(201).json({
                    message:
                        'Pengguna berhasil ditambahkan'
                });
            }
        );

    } catch (error) {

        res.status(500).json({
            message:
                'Gagal mengenkripsi password'
        });
    }
});

// ===============================
// LOGIN
// ===============================
app.post('/login', (req, res) => {

    const {
        email,
        password
    } = req.body;

    const sql =
        'SELECT * FROM pengguna WHERE email = ?';

    db.query(
        sql,
        [email],
        (err, result) => {

            if (err) {
                return res.status(500).json({
                    error: err.sqlMessage
                });
            }

            if (result.length === 0) {
                return res.status(404).json({
                    message: 'Akun tidak ditemukan'
                });
            }

            const user = result[0];

            bcrypt.compare(
                password,
                user.password,
                (err, passwordIsValid) => {

                    if (err) {
                        return res.status(500).json({
                            message:
                                'Gagal memeriksa password'
                        });
                    }

                    if (!passwordIsValid) {
                        return res.status(401).json({
                            message: 'Password salah'
                        });
                    }

                    const token = jwt.sign(
                        {
                            id: user.id_pengguna
                        },
                        'glowlisth rahasia',
                        {
                            expiresIn: 86400
                        }
                    );

                    res.status(200).json({
                        auth: true,
                        token: token,
                        id_pengguna:
                            user.id_pengguna,
                        nama: user.nama
                    });
                }
            );
        }
    );
});

// ===============================
// CEK ROUTE
// ===============================
console.log('Route /produk aktif');

// ===============================
// JALANKAN SERVER
// ===============================
app.listen(PORT, () => {
    console.log(
        `Server GlowList jalan di http://localhost:${PORT}`
    );
});