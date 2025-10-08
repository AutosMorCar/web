const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const session = require('express-session');
const multer = require('multer');
const mongoose = require('mongoose');
const path = require('path');
const nodemailer = require('nodemailer');

const fs = require('fs'); // Solo por si acaso
const Coche = require('./models/coche');
const { storage } = require('./cloudinary'); // ✅ Storage Cloudinary

const upload = multer({ storage }); // ✅ Multer con Cloudinary

const app = express();
const PORT = 3000;

// 🔗 Conexión MongoDB Atlas
mongoose.connect('mongodb+srv://Morcar:Madrid%4018@bdmorcar.cgprqun.mongodb.net/BDMorcar?retryWrites=true&w=majority')
  .then(() => console.log("✅ Conectado a MongoDB"))
  .catch(err => console.error("❌ Error de conexión:", err));

// Middleware
app.use(cors({ origin: true, credentials: true }));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

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

// Archivos estáticos
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'intro.html'));
});
app.use(express.static('public'));

// 🔐 LOGIN
app.post('/api/login', (req, res) => {
  const { usuario, password } = req.body;
  if (usuario === 'admin' && password === 'Madrid@18') {
    req.session.admin = true;
    return res.json({ ok: true });
  }
  res.status(401).json({ error: 'Credenciales incorrectas' });
});
app.get('/api/logged', (req, res) => res.json({ admin: !!req.session.admin }));
app.get('/api/logout', (req, res) => req.session.destroy(() => res.json({ ok: true })));

// 🚗 GET coches (desde MongoDB)
app.get('/api/coches', async (req, res) => {
  try {
    const coches = await Coche.find().sort({ fechaSubida: -1 }); // <- fijado
    res.json(coches);
  } catch (err) {
    res.status(500).json({ error: "Error al obtener los coches" });
  }
});

// 🚗 POST nuevo coche (con Cloudinary)
app.post('/api/coches', upload.array('imagenes'), async (req, res) => {
  const caracteristicas = req.body.caracteristicas
    ? req.body.caracteristicas.split(",").map(c => c.trim()).filter(Boolean)
    : [];

  // ✅ Leemos "tipo". Si por compatibilidad viene "estado", asumimos 'coche' por defecto.
  const tipo = req.body.tipo || (req.body.estado ? 'coche' : undefined);

  const nuevoCoche = new Coche({
    marca: req.body.marca,
    modelo: req.body.modelo,
    precio: parseFloat(req.body.precio),
    anio: parseInt(req.body.anio),
    km: parseInt(req.body.km),
    tipo, // <- ahora guardamos el tipo
    // estado: req.body.estado, // (opcional) solo si quisieras seguir guardando el viejo campo
    descripcion: req.body.descripcion || "",
    caracteristicas,
    imagenes: (req.files || []).map(f => f.path) // URLs de Cloudinary
  });

  try {
    await nuevoCoche.save();
    res.status(201).json({ mensaje: "Coche guardado correctamente con Cloudinary" });
  } catch (err) {
    console.error("❌ Error al guardar coche:", err);
    res.status(500).json({ error: "No se pudo guardar el coche" });
  }
});

// 🗑 DELETE coche
app.delete('/api/coches/:id', async (req, res) => {
  if (!req.session.admin) return res.status(403).json({ error: "Solo el admin puede eliminar" });

  try {
    const coche = await Coche.findById(req.params.id);
    if (!coche) return res.status(404).json({ error: "Coche no encontrado" });

    // 🔴 Opcional: eliminar de Cloudinary si guardas public_id
    // Por ahora solo lo eliminamos de la BD

    await coche.deleteOne();
    res.json({ mensaje: "Coche eliminado correctamente" });
  } catch (err) {
    console.error("❌ Error al eliminar coche:", err);
    res.status(500).json({ error: "No se pudo eliminar el coche" });
  }
});

// 📩 CONTACTO FICHA DE COCHE
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

// 🚗 GET coche por ID
app.get('/api/coches/:id', async (req, res) => {
  try {
    const coche = await Coche.findById(req.params.id);
    if (!coche) return res.status(404).json({ error: "Coche no encontrado" });
    res.json(coche);
  } catch (err) {
    res.status(500).json({ error: "Error al obtener el coche" });
  }
});

// ✏️ PUT editar coche
app.put('/api/coches/:id', upload.array('imagenes'), async (req, res) => {
  if (!req.session.admin) return res.status(403).json({ error: "Solo el admin puede editar" });

  try {
    const coche = await Coche.findById(req.params.id);
    if (!coche) return res.status(404).json({ error: "Coche no encontrado" });

    // Campos editables
    const {
      marca, modelo, precio, anio, km, tipo, descripcion, caracteristicas
    } = req.body;

    if (marca !== undefined) coche.marca = marca;
    if (modelo !== undefined) coche.modelo = modelo;
    if (precio !== undefined) coche.precio = parseFloat(precio);
    if (anio !== undefined) coche.anio = parseInt(anio);
    if (km !== undefined) coche.km = parseInt(km);
    if (tipo !== undefined) coche.tipo = tipo;               // <- usamos tipo
    if (descripcion !== undefined) coche.descripcion = descripcion;

    if (caracteristicas !== undefined) {
      coche.caracteristicas = caracteristicas
        ? caracteristicas.split(",").map(c => c.trim()).filter(Boolean)
        : [];
    }

    // Si en la edición subes imágenes nuevas, las añadimos
    if (req.files && req.files.length > 0) {
      coche.imagenes = [...coche.imagenes, ...req.files.map(f => f.path)];
    }

    await coche.save();
    res.json({ ok: true, coche });
  } catch (err) {
    console.error("❌ Error al editar coche:", err);
    res.status(500).json({ error: "No se pudo editar el coche" });
  }
});