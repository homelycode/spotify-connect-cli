'use strict';

const micro = require('micro');
const { router, get } = require('microrouter');
const Oauth2 = require('simple-oauth2');
const queryString = require('query-string');
const config = require('../config');

const oauth2 = Oauth2.create({
  client: {
    id: config.clientId,
    secret: config.clientSecret,
  },
  auth: {
    tokenHost: 'https://accounts.spotify.com',
    tokenPath: '/api/token',
    authorizePath: '/authorize',
  },
});

const callbackRoute = async (req, res) => {
  const debug = require('debug')('route:callback');
  const { code } = req.query;
  const tokenConfig = {
    code,
    redirect_uri: config.callbackUri,
    scope: config.authorizeScopes,
  };

  try {
    const result = await oauth2.authorizationCode.getToken(tokenConfig);
    const accessToken = oauth2.accessToken.create(result);

    debug('accessToken:', accessToken);

    res.setHeader('Location', `http://127.0.0.1:${config.port}/success?${queryString.stringify(accessToken.token)}`);
    await micro.send(res, 302);
  } catch (error) {
    console.error(error);
    await micro.send(res, 500, {
      error: 'Access Token Error: ' + error.message,
    });
  }
};

const successRoute = async (req, res) => {
  const debug = require('debug')('route:success');

  debug('query', req.query);

  process.send({
    ...req.query,
  });
  await micro.send(res, 200, 'You can close the tab now.');
};

const app = router(get('/callback', callbackRoute), get('/success', successRoute));
const server = micro(app);
server.listen(config.port);
