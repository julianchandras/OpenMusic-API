const { nanoid } = require('nanoid');
const { Pool } = require('pg');
const InvariantError = require('../api/exceptions/InvariantError');
const NotFoundError = require('../api/exceptions/NotFoundError');

class LikesService {
  constructor(cacheService) {
    this._pool = new Pool();
    this._cacheService = cacheService;
  }

  async addLike({ userId, albumId }) {
    const albumQuery = {
      text: 'SELECT id FROM albums WHERE id = $1',
      values: [albumId],
    };
    const albumResult = await this._pool.query(albumQuery);

    if (!albumResult.rowCount) {
      throw new NotFoundError('Album tidak ditemukan');
    }

    let query = {
      text: 'SELECT * from user_album_likes WHERE user_id = $1 AND album_id = $2',
      values: [userId, albumId],
    };
    let result = await this._pool.query(query);

    if (result.rowCount) {
      throw new InvariantError('Pengguna tidak dapat menyukai album yang sama kembali');
    }

    const id = `like-${nanoid(16)}`;
    query = {
      text: 'INSERT INTO user_album_likes VALUES ($1, $2, $3) RETURNING id',
      values: [id, userId, albumId],
    };
    result = await this._pool.query(query);

    await this._cacheService.delete(`playlists:${albumId}`);
    return result.rows[0].id;
  }

  async deleteLike({ userId, albumId }) {
    const query = {
      text: 'DELETE FROM user_album_likes WHERE user_id = $1 AND album_id = $2 RETURNING id',
      values: [userId, albumId],
    };

    const result = await this._pool.query(query);
    if (!result.rowCount) {
      throw new NotFoundError('Like gagal dihapus');
    }

    await this._cacheService.delete(`playlists:${albumId}`);
  }

  async getLikeByAlbumId(albumId) {
    const query = {
      text: `
        SELECT COUNT(*)
        FROM user_album_likes
        WHERE album_id = $1;
      `,
      values: [albumId],
    };

    const result = await this._pool.query(query);
    if (!result.rowCount) {
      throw new NotFoundError('Album tidak memiliki like');
    }

    const count = parseInt(result.rows[0].count, 10);
    await this._cacheService.set(`playlists:${albumId}`, count);
    return count;
  }
}

module.exports = LikesService;
