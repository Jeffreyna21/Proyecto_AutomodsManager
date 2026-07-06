const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const REPO_DIR = path.join(__dirname, '..', '..', 'src', 'repositories');

function readSource(name) {
  return fs.readFileSync(path.join(REPO_DIR, name), 'utf8');
}

function load(name) {
  const full = path.join(REPO_DIR, name);
  delete require.cache[require.resolve(full)];
  return require(full);
}

function instantiate(name) {
  const Cls = load(name);
  return new Cls();
}

describe('repositories — interface contracts', () => {
  it('IAutoRepository exports the documented method names', () => {
    const i = instantiate('IAutoRepository.js');
    for (const m of ['findById', 'findAllByUsuario', 'create', 'update', 'delete', 'existsPlacaForUsuario']) {
      assert.equal(typeof i[m], 'function', `IAutoRepository.${m} must be a function`);
    }
  });

  it('IModificacionRepository exports the documented method names', () => {
    const i = instantiate('IModificacionRepository.js');
    for (const m of ['findById', 'findByAutoId', 'create', 'update', 'delete']) {
      assert.equal(typeof i[m], 'function', `IModificacionRepository.${m} must be a function`);
    }
  });

  it('IUsuarioRepository exports the documented method names', () => {
    const i = instantiate('IUsuarioRepository.js');
    for (const m of ['findById', 'findByUsername']) {
      assert.equal(typeof i[m], 'function', `IUsuarioRepository.${m} must be a function`);
    }
  });

  it('ICatalogoRepository exports the documented method names', () => {
    const i = instantiate('ICatalogoRepository.js');
    for (const m of ['findMarcas', 'findModelosByMarca', 'findTiposModificacion']) {
      assert.equal(typeof i[m], 'function', `ICatalogoRepository.${m} must be a function`);
    }
  });

  it('IAnalisisRepository exports the documented method names', () => {
    const i = instantiate('IAnalisisRepository.js');
    for (const m of ['findByAutoId', 'upsert']) {
      assert.equal(typeof i[m], 'function', `IAnalisisRepository.${m} must be a function`);
    }
  });

  it('every interface method throws NotImplementedError when invoked', () => {
    const i = instantiate('IAutoRepository.js');
    assert.throws(() => i.findById(1), /Not implemented/i);
    assert.throws(() => i.findAllByUsuario(1, 10, 0), /Not implemented/i);
    assert.throws(() => i.create({}), /Not implemented/i);
    assert.throws(() => i.update(1, {}), /Not implemented/i);
    assert.throws(() => i.delete(1), /Not implemented/i);
    assert.throws(() => i.existsPlacaForUsuario('X', 1), /Not implemented/i);
  });
});

describe('repositories — interfaces have no DB imports', () => {
  const interfaceFiles = [
    'IAutoRepository.js',
    'IModificacionRepository.js',
    'IUsuarioRepository.js',
    'ICatalogoRepository.js',
    'IAnalisisRepository.js'
  ];

  for (const file of interfaceFiles) {
    it(`${file} does not import db or sql.js`, () => {
      const src = readSource(file);
      assert.doesNotMatch(src, /require\(['"]\.\.\/models\/db['"]\)/, `${file} must not require models/db`);
      assert.doesNotMatch(src, /require\(['"]sql\.js['"]\)/, `${file} must not require sql.js`);
    });
  }
});
