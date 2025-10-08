const mongoose = require('mongoose');

const cocheSchema = new mongoose.Schema({
  precio: { type: Number, required: true },

  // ✅ Nuevo: tipo de vehículo (sustituye a "estado")
  tipo: { type: String, enum: ['coche', 'furgoneta'], required: true },

  // (compatibilidad con documentos antiguos; no lo uses ya)
  estado: { type: String, enum: ['Como Nuevo', 'Usado', 'Averiado'], required: false },

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