const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const app = require('../app');

let server;
let port;

before(async () => {
  server = app.listen(0, () => {
    port = server.address().port;
  });

  await new Promise((resolve) => {
    const interval = setInterval(() => {
      if (port) {
        clearInterval(interval);
        resolve();
      }
    }, 10);
  });
});

after(async () => {
  if (server) {
    await new Promise((resolve, reject) => {
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve();
      });
    });
  }

  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
});

describe('Library Book API', () => {
  test('POST /api/books creates a book and validates title', async () => {
    const missingTitleResponse = await fetch(`http://127.0.0.1:${port}/api/books`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ author: 'Test Author', category: 'Test' }),
    });

    assert.equal(missingTitleResponse.status, 400);
    const missingTitleBody = await missingTitleResponse.json();
    assert.match(missingTitleBody.message, /Title is required/i);

    const title = `Test Book ${Date.now()}`;
    const createResponse = await fetch(`http://127.0.0.1:${port}/api/books`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title,
        author: 'Test Author',
        category: 'Fiction',
      }),
    });

    assert.equal(createResponse.status, 201);
    const createBody = await createResponse.json();
    assert.equal(createBody.book.title, title);
    assert.equal(createBody.book.availability, 'available');
  });

  test('GET /api/books returns paginated results', async () => {
    const response = await fetch(`http://127.0.0.1:${port}/api/books?page=1&limit=2`);
    assert.equal(response.status, 200);
    const data = await response.json();
    assert.ok(Array.isArray(data.books));
    assert.equal(data.currentPage, 1);
    assert.ok(data.totalBooks >= 1);
  });

  test('PATCH /api/books/:id updates availability and returns 404 for missing record', async () => {
    const bookResponse = await fetch(`http://127.0.0.1:${port}/api/books`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: `Update Book ${Date.now()}`,
        author: 'Update Author',
        category: 'Drama',
      }),
    });
    const createdBook = await bookResponse.json();
    const { _id } = createdBook.book;

    const updateResponse = await fetch(`http://127.0.0.1:${port}/api/books/${_id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ availability: 'unavailable' }),
    });

    assert.equal(updateResponse.status, 200);
    const updateBody = await updateResponse.json();
    assert.equal(updateBody.book.availability, 'unavailable');
    assert.equal(updateBody.book.available, false);

    const missingResponse = await fetch(`http://127.0.0.1:${port}/api/books/507f1f77bcf86cd799439011`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ availability: 'available' }),
    });

    assert.equal(missingResponse.status, 404);
    const missingBody = await missingResponse.json();
    assert.match(missingBody.message, /Book not found/i);
  });
});
