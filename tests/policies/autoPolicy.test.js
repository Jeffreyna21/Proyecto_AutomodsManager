const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const AutoPolicy = require('../../src/policies/AutoPolicy');

const owner = { id: 1, username: 'admin' };
const other = { id: 2, username: 'user' };
const auto = { id: 10, id_usuario: 1, placa: 'AAA111' };

describe('policies/AutoPolicy — owner-only access', () => {
  const policy = new AutoPolicy();

  it('owner can view the auto', () => {
    assert.equal(policy.canView(owner, auto), true);
  });

  it('owner can edit the auto', () => {
    assert.equal(policy.canEdit(owner, auto), true);
  });

  it('owner can delete the auto', () => {
    assert.equal(policy.canDelete(owner, auto), true);
  });

  it('non-owner cannot view the auto', () => {
    assert.equal(policy.canView(other, auto), false);
  });

  it('non-owner cannot edit the auto', () => {
    assert.equal(policy.canEdit(other, auto), false);
  });

  it('non-owner cannot delete the auto', () => {
    assert.equal(policy.canDelete(other, auto), false);
  });

  it('null user cannot view the auto', () => {
    assert.equal(policy.canView(null, auto), false);
  });

  it('null user cannot edit the auto', () => {
    assert.equal(policy.canEdit(null, auto), false);
  });

  it('null user cannot delete the auto', () => {
    assert.equal(policy.canDelete(null, auto), false);
  });

  it('undefined user cannot view the auto', () => {
    assert.equal(policy.canView(undefined, auto), false);
  });

  it('user without an id is treated as anonymous', () => {
    assert.equal(policy.canView({ username: 'no-id' }, auto), false);
  });
});
