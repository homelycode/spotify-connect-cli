'use strict';

const Command = require('common-bin');
const ora = require('ora');
const c = require('ansi-colors');
const opn = require('opn');
const Oauth2 = require('simple-oauth2');
const path = require('path');
const fork = require('child_process').fork;
const debug = require('debug')('command:auth');
const Configstore = require('configstore');
const pkg = require('../../package.json');
const { sleep } = require('../utils');
const config = require('../config');

class AuthCommand extends Command {
  constructor(rawArgv) {
    super(rawArgv);
    this.config = config;
    this.spinner = null;
    this.configStore = new Configstore(pkg.name);
    this.oauth2 = Oauth2.create({
      client: {
        id: config.clientId,
      },
      auth: {
        tokenHost: 'https://accounts.spotify.com',
        tokenPath: '/api/token',
        authorizePath: '/authorize',
      },
    });

    this.listenExit();
    this.startServer();
  }

  async run() {
    console.log(c.cyan(
      '❤️ You are about to be redirected to Spotify for authorizing me\n' +
      'to grab data from them, it\'s totally safe and your data won\'t be\n' +
      'transfered to some servers own by a Chinese guy.\n'
    ));

    await sleep(3000);

    this.spinner = ora('Waiting for magic to happen...');
    const authorizationUri = this.oauth2.authorizationCode.authorizeURL({
      redirect_uri: this.config.callbackUri,
      scope: this.config.authorizeScopes,
    });
    this.spinner.start();
    opn(authorizationUri);
  }

  startServer() {
    const serverPath = path.resolve(__dirname, '../server/index.js');
    this.serverProcess = fork(serverPath);
    this.listenSuccess();
  }

  listenExit() {
    process.on('exit', () => {
      this.cleanUp();
    });
  }

  listenSuccess() {
    this.serverProcess.on('message', payload => {
      debug('Success message received', payload);

      this.configStore.set({
        token: payload,
      });
      this.spinner.succeed('Successfully authorized!');
      process.exit();
    });
  }

  cleanUp() {
    if (this.serverProcess) {
      this.serverProcess.kill();
    }
  }
}

module.exports = AuthCommand;
