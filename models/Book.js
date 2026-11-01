const mongoose = require('mongoose');

const normalizeAvailability = (value) => {
  if (typeof value === 'boolean') {
    return value ? 'available' : 'unavailable';
  }

  if (typeof value === 'string') {
    const normalizedValue = value.trim().toLowerCase();
    if (['available', 'borrowed', 'unavailable'].includes(normalizedValue)) {
      return normalizedValue;
    }
    if (normalizedValue === 'true') return 'available';
    if (normalizedValue === 'false') return 'unavailable';
  }

  return 'available';
};

const bookSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    author: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      required: true,
      trim: true,
    },
    availability: {
      type: String,
      enum: ['available', 'borrowed', 'unavailable'],
      default: 'available',
      trim: true,
      lowercase: true,
    },
    available: {
      type: Boolean,
      default: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

bookSchema.pre('validate', function preValidate(next) {
  if (this.availability === undefined && this.available !== undefined) {
    this.availability = normalizeAvailability(this.available);
  }

  if (this.available === undefined && this.availability !== undefined) {
    this.available = ['available', 'borrowed'].includes(this.availability);
  }

  if (this.availability !== undefined) {
    this.availability = normalizeAvailability(this.availability);
  }

  if (this.available !== undefined && this.availability !== undefined) {
    this.available = ['available', 'borrowed'].includes(this.availability);
  }

  next();
});

module.exports = mongoose.model('Book', bookSchema);
