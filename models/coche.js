const mongoose = require('mongoose');

const cocheSchema = new mongoose.Schema({
  precio: { type: Number, required: true },
  estado: { type: String, enum: ['Como Nuevo', 'Usado', 'Averiado'], required: true },
  marca: { type: String, required: true },
  modelo: { type: String, required: true },
  anio: { type: Number, required: true },
  km: { type: Number, required: true },
  descripcion: { type: String },
  caracteristicas: [String],
  imagenes: [String], // URLs de Cloudinary
  fechaSubida: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Coche', cocheSchema);
