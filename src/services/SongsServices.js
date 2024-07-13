const { Pool } = require('pg');
const { nanoid } = require('nanoid');
const { mapSongDBToModel } = require('../utils');
const InvariantError = require('../api/exceptions/InvariantError');
const NotFoundError = require('../api/exceptions/NotFoundError');

class SongServices {
  constructor() {
    this._pool = new Pool();
  }

  async addSong({
    title, year, genre, performer, duration, albumId,
  }) {
    const id = `song-${nanoid(16)}`;

    const query = {
      text: 'INSERT INTO songs VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id',
      values: [id, title, year, genre, performer, duration, albumId],
    };

    const result = await this._pool.query(query);
    if (!result.rows[0].id) {
      throw new InvariantError('Lagu gagal ditambahkan');
    }
    return result.rows[0].id;
  }

  async getSongs({ title, performer }) {
    let text = 'SELECT * FROM songs WHERE TRUE';
    const params = [];

    if (title) {
      text += ` AND title ILIKE $${params.length + 1}`;
      params.push(`%${title}%`);
    }

    if (performer) {
      text += ` AND performer ILIKE $${params.length + 1}`;
      params.push(`%${performer}%`);
    }

    const result = await this._pool.query(text, params);
    return result.rows.map(mapSongDBToModel).map((row) => ({
      id: row.id,
      title: row.title,
      performer: row.performer,
    }));
  }

  async getSongById(id) {
    const query = {
      text: 'SELECT * FROM songs WHERE id = $1',
      values: [id],
    };

    const result = await this._pool.query(query);
    if (!result.rows.length) {
      throw new NotFoundError('Lagu tidak ditemukan');
    }
    return result.rows.map(mapSongDBToModel)[0];
  }

  async getSongsByAlbumId(albumId) {
    const query = {
      text: 'SELECT * FROM songs WHERE album_id = $1',
      values: [albumId],
    };

    const result = await this._pool.query(query);

    return result.rows.map(mapSongDBToModel).map((row) => ({
      id: row.id,
      title: row.title,
      performer: row.performer,
    }));
  }

  async updateSongById(id, {
    title, year, genre, performer, duration, albumId,
  }) {
    const query = {
      text: 'UPDATE songs SET title = $1, year = $2, genre = $3, performer = $4, duration = $5, album_id = $6 WHERE id = $7 RETURNING id',
      values: [title, year, genre, performer, duration, albumId, id],
    };

    const result = await this._pool.query(query);
    if (!result.rows.length) {
      throw new NotFoundError('Gagal memperbarui lagu');
    }
    return result.rows[0].id;
  }

  async deleteSongById(id) {
    const query = {
      text: 'DELETE FROM songs WHERE id = $1 RETURNING id',
      values: [id],
    };

    const result = await this._pool.query(query);
    if (!result.rows.length) {
      throw new NotFoundError('Lagu gagal dihapus. Id tidak ditemukan');
    }
  }
}

module.exports = SongServices;
