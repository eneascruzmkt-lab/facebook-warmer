const http = require('https');
const config = require('../config.json');

function sendTelegram(message) {
  const token = config.telegram?.botToken;
  const chatId = config.telegram?.chatId;

  if (!token || !chatId) return;

  const text = encodeURIComponent(message);
  const url = `https://api.telegram.org/bot${token}/sendMessage?chat_id=${chatId}&text=${text}&parse_mode=HTML`;

  http.get(url, (res) => {
    res.resume(); // consume response
  }).on('error', () => {
    // Silently fail — telegram is optional
  });
}

function notifyStart(profile, day) {
  sendTelegram(`<b>FB Warmer</b>\n\nPerfil <b>${profile}</b> iniciou o dia <b>${day}</b>`);
}

function notifyComplete(profile, day) {
  sendTelegram(`<b>FB Warmer</b>\n\nPerfil <b>${profile}</b> concluiu o dia <b>${day}</b> com sucesso`);
}

function notifyError(profile, message) {
  sendTelegram(`<b>FB Warmer</b>\n\nErro no perfil <b>${profile}</b>:\n${message}`);
}

function notifyManual(profile, message) {
  sendTelegram(`<b>FB Warmer</b>\n\nAcao manual necessaria no perfil <b>${profile}</b>:\n${message}`);
}

module.exports = { sendTelegram, notifyStart, notifyComplete, notifyError, notifyManual };
