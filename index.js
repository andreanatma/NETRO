// index.js
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
require('dotenv').config(); 

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.static('public'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Sinkronisasi database
const db = require('./models');
// Tips: Jika Anda baru saja membuat tabel patchcores dan belum muncul di DB,
// Anda bisa gunakan db.sequelize.sync({ alter: true }) untuk update struktur otomatis.
// Namun hati-hati, backup data dulu jika di production.
db.sequelize.sync()
  .then(() => {
    console.log("Synced db.");
  })
  .catch((err) => {
    console.log("Failed to sync db: " + err.message);
  });

// Route sederhana
app.get('/', (req, res) => {
  res.json({ message: 'Selamat datang di aplikasi inventory IP network!' });
});


// --- SEMUA ROUTE DIDEFINISIKAN DI SINI ---

// 1. Impor Route
const authRoutes = require('./routes/auth.routes');
const tempatRoutes = require('./routes/tempat.routes.js');
const sfpRoutes = require('./routes/sfp.routes.js');
const lpufRoutes = require('./routes/lpuf.routes.js');
const cardRoutes = require('./routes/card.routes.js');
const userRoutes = require('./routes/user.routes.js');
const dashboardRoutes = require('./routes/dashboard.routes.js');
const reportRoutes = require('./routes/report.routes.js'); 
const exportRoutes = require('./routes/export.routes.js'); 
// const patchcoreRoutes = require('./routes/patchcore.routes.js'); // <-- TAMBAHAN PATCHCORE

// 2. Registrasi Route
app.use('/api/auth', authRoutes);
app.use('/api/tempat', tempatRoutes);
app.use('/api/sfp', sfpRoutes);
app.use('/api/lpuf', lpufRoutes);
app.use('/api/card', cardRoutes);
app.use('/api/users', userRoutes);
app.use('/api', dashboardRoutes);
app.use('/api/report', reportRoutes);
app.use('/api/export', exportRoutes);
// app.use('/api/patchcore', patchcoreRoutes); // <-- REGISTRASI PATCHCORE


// --- START SERVER ---
app.listen(PORT, () => {
  console.log(`Server berjalan di port ${PORT}. Buka di http://localhost:${PORT}`);
});