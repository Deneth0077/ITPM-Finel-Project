// models/StockItem.js
const mongoose = require('mongoose');

const stockItemSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  image: {
    type: String,
    required: false
  },
  variants: {
    type: String,
    required: false
  },
  price: {
    type: String,
    required: false
  },
  category: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['InStock', 'Pending', 'OutOfStock'],
    required: true
  },
  unit: {
    type: String,
    required: true
  },
  weight: {
    type: Number, // Weight in grams, e.g., 500 for 500g
    required: false,
    min: 0
  },
  nutrients: {
    type: Object,
    required: false
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('StockItem', stockItemSchema);