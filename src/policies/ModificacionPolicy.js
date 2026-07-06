/**
 * ModificacionPolicy — owner-only access control for a Modificación.
 *
 * A modificación inherits its ownership from the parent auto. The
 * entity passed in is expected to embed the parent auto as
 * `entity.auto` (assembled by the use case from the repository).
 * This keeps the policy pure (no DB access) while propagating the
 * ownership check through the relation.
 */
class ModificacionPolicy {
  canView(user, modificacion) {
    return this._isOwner(user, modificacion);
  }

  canEdit(user, modificacion) {
    return this._isOwner(user, modificacion);
  }

  canDelete(user, modificacion) {
    return this._isOwner(user, modificacion);
  }

  _isOwner(user, entity) {
    if (!user || typeof user.id !== 'number') return false;
    if (!entity || !entity.auto || typeof entity.auto.id_usuario !== 'number') {
      return false;
    }
    return user.id === entity.auto.id_usuario;
  }
}

module.exports = ModificacionPolicy;
