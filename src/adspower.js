const http = require('http');
const puppeteer = require('puppeteer-core');

const config = require('../config.json');
const API = config.adspower.apiUrl;

function apiGet(path) {
  return new Promise((resolve, reject) => {
    http.get(`${API}${path}`, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(new Error(`AdsPower API parse error: ${data}`)); }
      });
    }).on('error', reject);
  });
}

async function startBrowser(adspowerId) {
  const res = await apiGet(`/api/v1/browser/start?serial_number=${adspowerId}`);
  if (res.code !== 0) throw new Error(`AdsPower start failed: ${res.msg}`);
  const wsUrl = res.data.ws.puppeteer;
  const browser = await puppeteer.connect({ browserWSEndpoint: wsUrl, defaultViewport: null });
  return browser;
}

async function stopBrowser(adspowerId) {
  const res = await apiGet(`/api/v1/browser/stop?serial_number=${adspowerId}`);
  return res.code === 0;
}

async function isBrowserActive(adspowerId) {
  const res = await apiGet(`/api/v1/browser/active?serial_number=${adspowerId}`);
  return res.data?.status === 'Active';
}

module.exports = { startBrowser, stopBrowser, isBrowserActive };
