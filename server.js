const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const session = require('express-session');
const multer = require('multer');
const path = require('path');
const nodemailer = require('nodemailer');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors({ origin: true, credentials: true }));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
// 🔄 Intro al inicio (debe ir ANTES de express.static)
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'intro.html'));
});

app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));

app.use(session({
  secret: 'carmazon-clave-supersecreta',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: false,
    maxAge: 1000 * 60 * 60 * 24
  }
}));

const dbPath = './data/coches.json';

// 🔐 LOGIN
app.post('/api/login', (req, res) => {
  const { usuario, password } = req.body;
  if (usuario === 'admin' && password === 'Madrid@18') {
    req.session.admin = true;
    return res.json({ ok: true });
  }
  res.status(401).json({ error: 'Credenciales incorrectas' });
});

app.get('/api/logged', (req, res) => {
  res.json({ admin: !!req.session.admin });
});

app.get('/api/logout', (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

// 🚗 GET coches
app.get('/api/coches', (req, res) => {
  const data = fs.readFileSync(dbPath);
  res.json(JSON.parse(data));
});

// 🚗 POST nuevo coche
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => {
    const nombreSeguro = file.originalname.replace(/\s+/g, '_');
    cb(null, `imagenes-${Date.now()}-${nombreSeguro}`);
  }
});
const upload = multer({ storage });

app.post('/api/coches', upload.array('imagenes'), (req, res) => {
  const data = fs.readFileSync(dbPath);
  const coches = JSON.parse(data);

  const caracteristicas = req.body.caracteristicas
    ? req.body.caracteristicas.split(",").map(c => c.trim()).filter(Boolean)
    : [];

  const nuevo = {
    marca: req.body.marca,
    modelo: req.body.modelo,
    precio: parseFloat(req.body.precio),
    anio: parseInt(req.body.anio),
    km: parseInt(req.body.km),
    estado: req.body.estado,
    descripcion: req.body.descripcion || "",
    caracteristicas,
    imagenes: req.files
      .sort((a, b) => a.fieldname.localeCompare(b.fieldname))
      .map(f => `/uploads/${f.filename}`)
  };

  coches.push(nuevo);
  fs.writeFileSync(dbPath, JSON.stringify(coches, null, 2));
  res.status(201).json({ mensaje: 'Coche guardado correctamente' });
});

// 🗑 DELETE coche
app.delete('/api/coches/:id', (req, res) => {
  if (!req.session.admin) return res.status(403).json({ error: "Solo el admin puede eliminar" });

  const id = parseInt(req.params.id);
  const data = fs.readFileSync(dbPath);
  const coches = JSON.parse(data);

  if (id < 0 || id >= coches.length) return res.status(404).json({ error: "Coche no encontrado" });

  coches[id].imagenes.forEach(pathRel => {
    const filePath = '.' + pathRel;
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  });

  coches.splice(id, 1);
  fs.writeFileSync(dbPath, JSON.stringify(coches, null, 2));
  res.json({ mensaje: "Coche eliminado correctamente" });
});

// 📩 CONTACTO DESDE FICHA DE COCHE
app.post('/api/contacto', multer().none(), async (req, res) => {
  const { nombre, email, telefono, mensaje, coche } = req.body;

  if (!nombre || !email || !mensaje || !coche) {
    return res.status(400).json({ error: "Faltan campos obligatorios" });
  }

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: 'carmazon14@gmail.com',
      pass: 'tjlu mrzv lwqr zrnz'
    }
  });

  const mailOptions = {
    from: 'carmazon14@gmail.com',
    to: 'carmazon14@gmail.com',
    subject: `📩 Consulta sobre el coche: ${coche} de ${nombre}`,
    html: `
      <h3>Consulta de contacto</h3>
      <p><strong>Nombre:</strong> ${nombre}</p>
      <p><strong>Email:</strong> ${email}</p>
      <p><strong>Teléfono:</strong> ${telefono || 'No proporcionado'}</p>
      <p><strong>Anuncio:</strong> ${coche}</p>
      <p><strong>Mensaje:</strong></p>
      <p>${mensaje}</p>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    res.status(200).json({ ok: true });
  } catch (err) {
    console.error("❌ Error enviando correo:", err);
    res.status(500).json({ error: "Error al enviar el correo" });
  }
});

// 📩 FORMULARIO DE BÚSQUEDA DE COCHE
app.post('/api/buscocoche', multer().none(), async (req, res) => {
  const { nombre, email, telefono, mensaje } = req.body;

  if (!nombre || !email || !mensaje) {
    return res.status(400).json({ error: "Faltan campos obligatorios" });
  }

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: 'carmazon14@gmail.com',
      pass: 'tjlu mrzv lwqr zrnz'
    }
  });

  const mailOptions = {
    from: 'carmazon14@gmail.com',
    to: 'carmazon14@gmail.com',
    subject: `📥 Nueva solicitud personalizada - ${nombre}`,
    html: `
      <h3>Un usuario está buscando un coche</h3>
      <p><strong>Nombre:</strong> ${nombre}</p>
      <p><strong>Email:</strong> ${email}</p>
      <p><strong>Teléfono:</strong> ${telefono || 'No proporcionado'}</p>
      <p><strong>Mensaje:</strong></p>
      <p>${mensaje}</p>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    res.status(200).json({ ok: true });
  } catch (err) {
    console.error("❌ Error enviando búsqueda personalizada:", err);
    res.status(500).json({ error: "Error al enviar el correo" });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Servidor activo en http://localhost:${PORT}`);
});
