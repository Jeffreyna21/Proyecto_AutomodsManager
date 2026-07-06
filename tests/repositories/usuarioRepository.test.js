const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { createInMemoryDb, closeInMemoryDb } = require('../helpers/inMemoryDb');
const UsuarioRepository = require('../../src/repositories/UsuarioRepository');

describe('repositories/UsuarioRepository', () => {
  let db;
  let repo;

  before(async () => {
    db = await createInMemoryDb();
    repo = new UsuarioRepository(db);
  });

  after(() => { if (db) closeInMemoryDb(db); });

  it('findByUsername() returns the user when present', () => {
    const u = repo.findByUsername('admin');
    assert.equal(u.username, 'admin');
    assert.equal(typeof u.id, 'number');
    assert.ok(u.password, 'password hash must be present');
  });

  it('findByUsername() returns null when the user does not exist', () => {
    assert.equal(repo.findByUsername('nobody'), null);
  });

  it('findById() returns the user when present', () => {
    const u = repo.findByUsername('user');
    const found = repo.findById(u.id);
    assert.equal(found.username, 'user');
  });

  it('findById() returns null when the user does not exist', () => {
    assert.equal(repo.findById(99999), null);
  });
});
