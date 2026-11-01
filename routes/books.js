const express = require('express');
const mongoose = require('mongoose');
const Book = require('../models/Book');

const router = express.Router();
const memoryBooks = [];

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

const useMemoryStore = () => mongoose.connection.readyState !== 1;

const formatBook = (book) => {
  if (!book) return null;

  const normalizedAvailability = normalizeAvailability(book.availability ?? book.available ?? 'available');
  const isAvailable = ['available', 'borrowed'].includes(normalizedAvailability);

  return {
    ...book,
    availability: normalizedAvailability,
    available: isAvailable,
  };
};

router.post('/', async (req, res) => {
  try {
    const { title, author, category, availability, available } = req.body || {};

    if (!title || !String(title).trim()) {
      return res.status(400).json({ message: 'Title is required.' });
    }

    const payload = {
      title: String(title).trim(),
      author: author ? String(author).trim() : '',
      category: category ? String(category).trim() : '',
      availability: normalizeAvailability(availability ?? available ?? 'available'),
      available: normalizeAvailability(availability ?? available ?? 'available') !== 'unavailable',
    };

    if (useMemoryStore()) {
      const book = {
        _id: `memory-${Date.now()}-${memoryBooks.length + 1}`,
        ...payload,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      memoryBooks.push(book);
      return res.status(201).json({ message: 'Book created successfully', book: formatBook(book) });
    }

    const createdBook = await Book.create(payload);
    return res.status(201).json({ message: 'Book created successfully', book: formatBook(createdBook.toObject()) });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to create book', error: error.message });
  }
});

router.get('/', async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.max(parseInt(req.query.limit, 10) || 10, 1);

    if (useMemoryStore()) {
      const totalRecords = memoryBooks.length;
      const startIndex = (page - 1) * limit;
      const paginatedBooks = memoryBooks.slice(startIndex, startIndex + limit).map((book) => formatBook(book));

      return res.status(200).json({
        books: paginatedBooks,
        currentPage: page,
        page,
        totalBooks: totalRecords,
        totalRecords,
        totalPages: Math.ceil(totalRecords / limit),
      });
    }

    const totalRecords = await Book.countDocuments();
    const books = await Book.find()
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    return res.status(200).json({
      books: books.map((book) => formatBook(book)),
      currentPage: page,
      page,
      totalBooks: totalRecords,
      totalRecords,
      totalPages: Math.ceil(totalRecords / limit),
    });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch books', error: error.message });
  }
});

router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { availability, available } = req.body || {};

    if (availability === undefined && available === undefined) {
      return res.status(400).json({ message: 'Availability status is required.' });
    }

    const normalizedAvailability = normalizeAvailability(availability ?? available ?? 'available');
    const updatedPayload = {
      availability: normalizedAvailability,
      available: ['available', 'borrowed'].includes(normalizedAvailability),
    };

    if (useMemoryStore()) {
      const index = memoryBooks.findIndex((book) => String(book._id) === String(id));
      if (index === -1) {
        return res.status(404).json({ message: 'Book not found.' });
      }

      memoryBooks[index] = {
        ...memoryBooks[index],
        ...updatedPayload,
        updatedAt: new Date(),
      };

      return res.status(200).json({
        message: 'Book updated successfully',
        book: formatBook(memoryBooks[index]),
      });
    }

    const updatedBook = await Book.findByIdAndUpdate(id, updatedPayload, {
      new: true,
      runValidators: true,
    });

    if (!updatedBook) {
      return res.status(404).json({ message: 'Book not found.' });
    }

    return res.status(200).json({
      message: 'Book updated successfully',
      book: formatBook(updatedBook.toObject()),
    });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to update book', error: error.message });
  }
});

module.exports = router;
