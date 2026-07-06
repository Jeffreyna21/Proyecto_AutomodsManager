const { createNotImplementedError } = require('./_notImplemented');

/**
 * Common CRUD contract shared by all repositories. Pure interface — no
 * implementation is provided here. Concrete repos extend this class so
 * each one documents the shape of its CRUD surface in a single place.
 */
class BaseRepository {
  findById(id) { throw createNotImplementedError('BaseRepository.findById'); }
  findAll(/* filters */) { throw createNotImplementedError('BaseRepository.findAll'); }
  create(input) { throw createNotImplementedError('BaseRepository.create'); }
  update(id, input) { throw createNotImplementedError('BaseRepository.update'); }
  delete(id) { throw createNotImplementedError('BaseRepository.delete'); }
}

module.exports = BaseRepository;
