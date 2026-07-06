const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const ModificacionPolicy = require('../../src/policies/ModificacionPolicy');

const owner = { id: 1, username: 'admin' };
const other = { id: 2, username: 'user' };

// The entity shape the policy expects: { auto: { id_usuario, ... } }.
// The use case is responsible for assembling this from the repository.
const modForOwner = { id: 100, nombre: 'Turbo', auto: { id: 10, id_usuario: 1 } };
const modForOther = { id: 101, nombre: 'NOS', auto: { id: 11, id_usuario: 2 } };

describe('policies/ModificacionPolicy — auto ownership propagates', () => {
  const policy = new ModificacionPolicy();

  it('owner of the parent auto can view the modification', () => {
    assert.equal(policy.canView(owner, modForOwner), true);
  });

  it('owner of the parent auto can edit the modification', () => {
    assert.equal(policy.canEdit(owner, modForOwner), true);
  });

  it('owner of the parent auto can delete the modification', () => {
    assert.equal(policy.canDelete(owner, modForOwner), true);
  });

  it('non-owner of the parent auto cannot view the modification', () => {
    assert.equal(policy.canView(other, modForOwner), false);
  });

  it('non-owner of the parent auto cannot edit the modification', () => {
    assert.equal(policy.canEdit(other, modForOwner), false);
  });

  it('non-owner of the parent auto cannot delete the modification', () => {
    assert.equal(policy.canDelete(other, modForOwner), false);
  });

  it('null user cannot view the modification', () => {
    assert.equal(policy.canView(null, modForOwner), false);
  });

  it('null user cannot edit the modification', () => {
    assert.equal(policy.canEdit(null, modForOwner), false);
  });

  it('null user cannot delete the modification', () => {
    assert.equal(policy.canDelete(null, modForOwner), false);
  });

  it('an entity without an auto reference is denied (defensive default)', () => {
    const orphan = { id: 999, nombre: 'Orphan' };
    assert.equal(policy.canView(owner, orphan), false);
    assert.equal(policy.canEdit(owner, orphan), false);
    assert.equal(policy.canDelete(owner, orphan), false);
  });
});
