const autoBind = require('auto-bind');

class LikeHandler {
  constructor(service, cacheService) {
    this._service = service;
    this._cacheService = cacheService;

    autoBind(this);
  }

  async postAlbumLikeHandler(request, h) {
    const { id: userId } = request.auth.credentials;
    const { id: albumId } = request.params;

    await this._service.addLike({ userId, albumId });

    const response = h.response({
      status: 'success',
      message: 'Like berhasil ditambahkan',
    });
    response.code(201);
    return response;
  }

  async deleteAlbumLikeHandler(request, h) {
    const { id: userId } = request.auth.credentials;
    const { id: albumId } = request.params;

    await this._service.deleteLike({ userId, albumId });
    const response = h.response({
      status: 'success',
      message: 'Like berhasil dihapus',
    });
    response.code(200);
    return response;
  }

  async getAlbumLikesByAlbumIdHandler(request, h) {
    const { id: albumId } = request.params;

    let likes;
    try {
      const result = await this._cacheService.get(`playlists:${albumId}`);
      likes = parseInt(result, 10);

      const response = h.response({
        status: 'success',
        data: {
          likes,
        },
      });
      response.header('X-Data-Source', 'cache');
      response.code(200);

      return response;
    } catch (error) {
      likes = await this._service.getLikeByAlbumId(albumId);

      const response = h.response({
        status: 'success',
        data: {
          likes,
        },
      });
      response.code(200);

      return response;
    }
  }
}

module.exports = LikeHandler;
