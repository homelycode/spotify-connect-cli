'use strict';

const config = {
  port: 48400,
  clientId: 'ad56a82af9144972a9a7da3c36ae3bf1',
  clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
  serverUri: process.env.SERVER_URI || 'http://127.0.0.1:48400',
  authorizeScopes: [ 'user-modify-playback-state', 'user-read-currently-playing', 'user-read-playback-state' ],
};

config.callbackUri = `${config.serverUri}/callback`;

module.exports = config;
