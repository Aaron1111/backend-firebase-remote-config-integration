const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');
const serviceAccount = require('./hi-fish-maps-6690c-firebase-adminsdk-z1okm-d6b239f88a.json'); // File rahasia Anda

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: process.env.databaseURL // Pastikan ini sesuai dengan URL database Anda
});

const app = express();
app.use(cors());
app.use(express.json());

app.get('/api/config', async (req, res) => {
  try {
    const template = await admin.remoteConfig().getTemplate();
    res.status(200).json({ parameters: template.parameters, success: true });
  } catch (error) {
    res.status(500).json({ error: error.message, success: false });
  }
});

// Endpoint untuk mengubah parameter Remote Config
app.post('/api/config', async (req, res) => {
  const { key, value, valueType, useInAppDefault, description } = req.body;

  // Konversi input string ke boolean jika dikirim sebagai string dari body request
  const isUseInAppDefault = useInAppDefault === true || useInAppDefault === 'true';

  // Validasi: Jika isUseInAppDefault true, value tidak wajib diisi
  if (!key || (!isUseInAppDefault && value === undefined)) {
    return res.status(400).json({ error: 'Key wajib diisi, dan Value wajib diisi jika tidak menggunakan In-App Default.' });
  }

  try {
    const rc = admin.remoteConfig();

    // 1. Ambil template Remote Config yang aktif saat ini
    const template = await rc.getTemplate();

    // 2. Buat objek parameter baru dengan tipe data yang ditentukan
    const parameterConfig = {
      valueType: valueType || 'STRING',
      description: description || ''
    };
    
    if (isUseInAppDefault) {
      // CARA YANG BENAR: Set properti useInAppDefault ke true
      parameterConfig.defaultValue = {
        useInAppDefault: true
      };
    } else {
      // Jika false, isi dengan nilai string biasa
      parameterConfig.defaultValue = { 
        value: String(value) 
      };
    }

    // Masukkan konfigurasi baru ke dalam struktur template
    template.parameters[key] = parameterConfig;

    // 3. Validasi template sebelum dipublikasikan
    await rc.validateTemplate(template);

    // 4. Publikasikan template baru agar aktif di cloud
    await rc.publishTemplate(template);

    res.status(200).json({ success: true, message: `Parameter '${key}' berhasil diperbarui.` });
  } catch (error) {
    console.error('Error Remote Config:', error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(3000, () => console.log('Server berjalan di port 3000'));