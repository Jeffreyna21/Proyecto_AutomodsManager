/**
 * AutoPolicy — owner-only access control for an Auto entity.
 *
 * A user is allowed to view/edit/delete an auto if and only if the
 * user's id matches the auto's `id_usuario`. Anonymous users (null,
 * undefined, or a user without an id) are always denied.
 */
class AutoPolicy {
  /**
   * @param {{ id: number }|null|undefined} user
   * @param {{ id_usuario: number }|null|undefined} auto
   * @returns {boolean}
   */
  canView(user, auto) {
    return this._isOwner(user, auto);
  }

  canEdit(user, auto) {
    return this._isOwner(user, auto);
  }

  canDelete(user, auto) {
    return this._isOwner(user, auto);
  }

  _isOwner(user, entity) {
    if (!user || typeof user.id !== 'number') return false;
    if (!entity || typeof entity.id_usuario !== 'number') return false;
    return user.id === entity.id_usuario;
  }
}

module.exports = AutoPolicy;
