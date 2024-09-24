const PlaylistsHandler = require('./handler');
const routes = require('./routes');

module.exports = {
  name: 'likes',
  version: '1.0.0',
  register: async (server, { service }) => {
    const playlistsHandler = new PlaylistsHandler(service);
    server.route(routes(playlistsHandler));
  },
};
