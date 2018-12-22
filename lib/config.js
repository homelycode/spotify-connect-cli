'use strict';

module.exports = {
  port: 48400,
  clientId: 'ad56a82af9144972a9a7da3c36ae3bf1',
  clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
  callbackUri: process.env.SPOTIFY_CALLBACL_URI || 'http://127.0.0.1:48400/callback',
  authorizeScopes: [ 'user-modify-playback-state', 'user-read-currently-playing', 'user-read-playback-state' ],
};
