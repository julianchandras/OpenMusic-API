/* eslint no-console: "off" */

require('dotenv').config();

const Hapi = require('@hapi/hapi');
const albums = require('./api/albums');
const songs = require('./api/songs');
const AlbumsServices = require('./services/AlbumsServices');
const SongsServices = require('./services/SongsServices');
const AlbumsValidator = require('./validator/albums');
const SongsValidator = require('./validator/songs');
const ClientError = require('./api/exceptions/ClientError');

const init = async () => {
  const server = Hapi.server({
    port: process.env.PORT,
    host: process.env.HOST,
    routes: {
      cors: {
        origin: ['*'],
      },
    },
  });

  const albumsServices = new AlbumsServices();
  await server.register({
    plugin: albums,
    options: {
      service: albumsServices,
      validator: AlbumsValidator,
    },
  });

  const songsServices = new SongsServices();
  await server.register({
    plugin: songs,
    options: {
      service: songsServices,
      validator: SongsValidator,
    },
  });

  server.ext('onPreResponse', (request, h) => {
    // mendapatkan konteks response dari request
    const { response } = request;

    // penanganan client error secara internal.
    if (response instanceof ClientError) {
      const newResponse = h.response({
        status: 'fail',
        message: response.message,
      });
      newResponse.code(response.statusCode);
      return newResponse;
    }

    return h.continue;
  });

  await server.start();
  console.log(`Server berjalan pada ${server.info.uri}`);
};

init();
