const { Pool } = require('pg');
const { nanoid } = require('nanoid');
const SongsServices = require('./SongsServices');
const InvariantError = require('../api/exceptions/InvariantError');
const NotFoundError = require('../api/exceptions/NotFoundError');
const AuthorizationError = require('../api/exceptions/AuthorizationError');

class PlaylistsServices {
  constructor() {
    this._pool = new Pool();
    this._songsServices = new SongsServices();
  }

  async addPlaylist({ name, owner }) {
    const id = `playlist-${nanoid(16)}`;

    const query = {
      text: 'INSERT INTO playlists VALUES ($1, $2, $3) RETURNING id',
      values: [id, name, owner],
    };

    const result = await this._pool.query(query);
    if (!result.rows[0].id) {
      throw new InvariantError('Playlist gagal ditambahkan');
    }
    return result.rows[0].id;
  }

  async getPlaylists(owner) {
    const query = {
      text: `
        SELECT playlists.id AS id, playlists.name AS name, users.username AS username
        FROM playlists
        INNER JOIN users ON playlists.owner = users.id
        WHERE users.id = $1
      `,
      values: [owner],
    };

    const result = await this._pool.query(query);
    return result.rows;
  }

  async deletePlaylistById(id) {
    const query = {
      text: 'DELETE FROM playlists WHERE id = $1 RETURNING id',
      values: [id],
    };

    const result = await this._pool.query(query);
    if (!result.rowCount) {
      throw new NotFoundError('Playlist gagal dihapus. Id tidak ditemukan');
    }
  }

  async addPlaylistSong(playlistId, songId, owner) {
    await this._songsServices.getSongById(songId);
    await this.getPlaylistById(playlistId);

    const id = `playlist_songs-${nanoid(16)}`;

    const query = {
      text: 'INSERT INTO playlist_songs VALUES ($1, $2, $3) RETURNING id',
      values: [id, playlistId, songId],
    };

    const result = await this._pool.query(query);
    if (!result.rows[0].id) {
      throw new InvariantError('Lagu gagal ditambahkan ke dalam playlist');
    }

    this.addPlaylistSongActivity({
      playlistId,
      songId,
      userId: owner,
      action: 'add',
      time: new Date().toISOString(),
    });
  }

  async getPlaylistSongs(id) {
    let query = {
      text: `
        SELECT playlists.id AS id, playlists.name AS name, users.username AS username
        FROM playlists
        INNER JOIN users ON playlists.owner = users.id
        WHERE playlists.id = $1
      `,
      values: [id],
    };
    const playlistResult = await this._pool.query(query);

    if (!playlistResult.rowCount) {
      throw new NotFoundError('Playlist tidak ditemukan');
    }

    query = {
      text: `
        SELECT songs.id AS id, songs.title AS title, songs.performer AS performer
        FROM songs
        INNER JOIN playlist_songs ON playlist_songs.song_id = songs.id
        WHERE playlist_songs.playlist_id = $1
      `,
      values: [id],
    };
    const songsResult = await this._pool.query(query);

    const songs = songsResult.rows.map((row) => ({
      id: row.id,
      title: row.title,
      performer: row.performer,
    }));

    return {
      ...playlistResult.rows[0],
      songs,
    };
  }

  async deletePlaylistSong(id, { songId }, owner) {
    const query = {
      text: 'DELETE FROM playlist_songs WHERE playlist_id = $1 AND song_id = $2',
      values: [id, songId],
    };

    const result = await this._pool.query(query);
    if (!result.rowCount) {
      throw new NotFoundError('Lagu gagal dihapus dari playlist');
    }

    this.addPlaylistSongActivity({
      playlistId: id,
      songId,
      userId: owner,
      action: 'delete',
      time: new Date().toISOString(),
    });
  }

  async getPlaylistById(id) {
    const query = {
      text: 'SELECT * FROM playlists WHERE id = $1',
      values: [id],
    };

    const result = await this._pool.query(query);
    if (!result.rowCount) {
      throw new NotFoundError('Playlist tidak ditemukan');
    }
    return result.rows[0];
  }

  async verifyPlaylistOwner(id, owner) {
    const query = {
      text: 'SELECT * FROM playlists WHERE id = $1',
      values: [id],
    };

    const result = await this._pool.query(query);
    if (!result.rowCount) {
      throw new NotFoundError('Playlist tidak ditemukan');
    }

    const note = result.rows[0];
    if (note.owner !== owner) {
      throw new AuthorizationError('Anda tidak berhak mengakses resource ini');
    }
  }

  async getPlaylistActivities({ playlistId }) {
    const query = {
      text: `
        SELECT 
          users.username AS username, 
          songs.title AS title, 
          psa.action AS action, 
          psa.time AS time
        FROM playlist_song_activities AS psa
        INNER JOIN playlists ON psa.playlist_id = playlists.id
        INNER JOIN users ON users.id = psa.user_id
        INNER JOIN songs ON songs.id = psa.song_id
        WHERE psa.playlist_id = $1
      `,
      values: [playlistId],
    };

    const result = await this._pool.query(query);

    if (!result.rowCount) {
      throw new NotFoundError('Aktivitas playlist tidak ditemukan');
    }
    return result.rows;
  }

  async addPlaylistSongActivity({
    playlistId,
    songId,
    userId,
    action,
    time,
  }) {
    const id = `playlist_song_activities-${nanoid(16)}`;
    const query = {
      text: 'INSERT INTO playlist_song_activities VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
      values: [id, playlistId, songId, userId, action, time],
    };

    const result = await this._pool.query(query);
    if (!result.rows[0].id) {
      throw new InvariantError('Aktivitas playlist gagal dicatat');
    }
  }
}

module.exports = PlaylistsServices;
