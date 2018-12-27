'use strict';

const axios = require('axios');
const Configstore = require('configstore');
const debug = require('debug')('http');
const pkg = require('../package');

const axiosClient = axios.create({
  baseURL: 'https://api.spotify.com/v1',
  timeout: 10000,
  proxy: false,
});

axiosClient.interceptors.request.use(config => {
  const configStore = new Configstore(pkg.name);
  const token = configStore.get('token');
  config.headers.Authorization = `Bearer ${token.access_token}`;
  debug(config);
  return config;
}, error => {
  // Do something with request error
  return Promise.reject(error);
});

module.exports = axiosClient;
