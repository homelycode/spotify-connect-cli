'use strict';

const Command = require('common-bin');
const ora = require('ora');
const debug = require('debug')('command:start');
const c = require('ansi-colors');
const Configstore = require('configstore');
const Oauth2 = require('simple-oauth2');
const { prompt, NumberPrompt } = require('enquirer');
const axios = require('axios');
const _ = require('lodash');
const request = require('../request');
const config = require('../config');
const { sleep } = require('../utils');
const pkg = require('../../package.json');

class StartCommand extends Command {
  constructor(rawArgv) {
    super(rawArgv);
    this.configStore = new Configstore(pkg.name);
    this.config = config;
    this.deviceList = [];
    this.spinner = null;
    this.activeDevice = null;
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
  }

  async run() {
    await this.checkAccessToken();
    await this.checkIsCurrentlyPlaying();
    await this.requestDeviceList();

    const question = {
      type: 'select',
      name: 'device',
      message: 'Which device to play?',
      choices: this.deviceList.map(item => ({
        name: item.name, hint: item.is_active ? 'Playing' : '',
      })),
    };
    const choice = await prompt(question);

    if (!choice.device) {
      this.exit();
      return;
    }

    debug('device choice', choice.device);
    await this.choseTarget(choice.device);
    process.exit();
  }

  async choseTarget(deviceName) {
    const target = this.deviceList.find(item => item.name === deviceName);
    const prompt = new NumberPrompt({
      name: 'volume',
      message: 'Enter a number as volume',
      initial: 50,
    });
    const volume = await prompt.run();

    if (typeof volume === 'undefined') {
      this.exit();
      return;
    }

    debug('Choose device', target.name, target.id, volume);

    this.spinner.start('Sending command to Spotify...');
    if (this.activeDevice && target.id !== this.activeDevice.id) {
      await this.pauseDevice(this.activeDevice.id);
    }
    await sleep(3000);
    // await request({
    //   url: '/me/player',
    //   method: 'PUT',
    //   data: {
    //     device_ids: [ target.id ],
    //     play: false,
    //   },
    // })
    //   .catch(this.onSpotifyError.bind(this));
    // debug('Device set', target.id);
    await request({
      url: '/me/player/play',
      method: 'PUT',
      params: {
        device_id: target.id,
      },
    })
      .catch(this.onSpotifyError.bind(this));
    debug('Device playing', target.id);
    await this.setDeviceVolume(target.id, volume);
    this.spinner.succeed();
  }

  async pauseDevice(deviceId) {
    await request({
      method: 'PUT',
      url: '/me/player/pause',
      params: {
        device_id: deviceId,
      },
    })
      .catch(this.onSpotifyError.bind(this));
    debug('Paused playing', deviceId);
  }

  async setDeviceVolume(deviceId, volume) {
    debug('Setting volume to', deviceId, volume);
    await request({
      method: 'PUT',
      url: '/me/player/volume',
      params: {
        device_id: deviceId,
        volume_percent: volume,
      },
    })
      .catch(this.onSpotifyError.bind(this));
    debug('Volume set to', deviceId, volume);
  }

  async checkIsCurrentlyPlaying() {
    this.spinner = ora('Checking currently playing device...').start();
    const res = await request({
      method: 'get',
      url: '/me/player',
    });

    if (res.status === 200) {
      debug('Currently playing', res.data);
      this.activeDevice = res.data.device;
      this.spinner.succeed(res.data.item.name);
    } else {
      this.spinner.fail();
      this.exitError('No song is playing.');
      return;
    }
  }

  async requestDeviceList() {
    this.spinner = ora('Fetching available devices...').start();
    const res = await request({
      method: 'get',
      url: '/me/player/devices',
    });

    this.spinner.succeed();
    debug('deviceList', res.data.devices);
    this.deviceList = res.data.devices;
  }

  async checkAccessToken() {
    if (!this.configStore.get('token')) {
      this.exitError('You haven\'t authorized yet, run `scc auth` first');
      return;
    }

    const accessToken = this.getAccessToken();
    const refreshToken = this.configStore.get('token').refresh_token;

    if (accessToken.expired()) {
      try {
        debug('Refreshing accessToken');
        const res = await axios({
          url: `${this.config.serverUri}/refresh`,
          method: 'POST',
          data: {
            token: accessToken.token,
          },
          proxy: false,
        });
        debug('Refreshed accessToken', res.data.token);
        this.configStore.set('token', {
          ...res.data.token,
          refresh_token: refreshToken,
        });
      } catch (error) {
        debug(error);
        this.exitError('Error refreshing access token: ' + error.message);
      }
    } else {
      debug('accessToken is still valid.');
    }
  }

  onSpotifyError(err) {
    // console.error(err);
    if (err.response) {
      const msg = _.get(err, 'response.data.error.message', 'Unknown error');
      const reason = _.get(err, 'response.data.error.reason', 'Unknown reason');
      this.exitError(err.response.status, msg, reason);
    } else {
      this.exitError(err.message);
    }
  }

  getAccessToken() {
    return this.oauth2.accessToken.create(this.configStore.get('token'));
  }

  exitError(...args) {
    const msgs = args.map(item => c.red(item));
    console.log('🚨', ...msgs);
    process.exit(1);
  }

  exit() {
    process.exit();
  }
}

module.exports = StartCommand;
