const API_KEY = '__BAIDU_API_KEY__';
const SECRET_KEY = '__BAIDU_SECRET_KEY__';

const TOKEN_URL = 'https://aip.baidubce.com/oauth/2.0/token';
const ASR_URL = 'https://vop.baidu.com/server_api';
const TOKEN_KEY = 'baidu_asr_token';

function isConfigured() {
  return Boolean(API_KEY && SECRET_KEY)
    && API_KEY.indexOf('__') !== 0
    && SECRET_KEY.indexOf('__') !== 0;
}

function fetchToken() {
  return new Promise((resolve, reject) => {
    wx.request({
      url: `${TOKEN_URL}?grant_type=client_credentials&client_id=${API_KEY}&client_secret=${SECRET_KEY}`,
      method: 'POST',
      success: (res) => {
        if (res.data && res.data.access_token) {
          const payload = {
            token: res.data.access_token,
            expires: Date.now() + (res.data.expires_in || 2592000) * 1000 - 600000
          };
          wx.setStorageSync(TOKEN_KEY, payload);
          resolve(payload.token);
        } else {
          reject(new Error('获取语音识别凭证失败，请检查密钥'));
        }
      },
      fail: reject
    });
  });
}

function getToken() {
  const cached = wx.getStorageSync(TOKEN_KEY);
  if (cached && cached.token && cached.expires > Date.now()) {
    return Promise.resolve(cached.token);
  }
  return fetchToken();
}

function readAudioBase64(filePath) {
  return new Promise((resolve, reject) => {
    wx.getFileSystemManager().readFile({
      filePath,
      encoding: 'base64',
      success: (res) => resolve(res.data),
      fail: reject
    });
  });
}

function recognize(filePath) {
  if (!isConfigured()) {
    return Promise.reject(new Error('未配置百度语音识别密钥'));
  }
  return Promise.all([getToken(), readAudioBase64(filePath)]).then(([token, base64]) => {
    const cleanLength = String(base64).replace(/=+$/, '').length;
    return new Promise((resolve, reject) => {
      wx.request({
        url: ASR_URL,
        method: 'POST',
        header: { 'Content-Type': 'application/json' },
        data: {
          format: 'wav',
          rate: 16000,
          channel: 1,
          cuid: 'shengyi-liuhen',
          token,
          speech: base64,
          len: Math.floor(cleanLength * 3 / 4)
        },
        success: (res) => {
          if (res.data && res.data.err_no === 0 && res.data.result && res.data.result.length) {
            resolve(res.data.result.join(''));
          } else {
            reject(new Error((res.data && res.data.err_msg) || '识别失败'));
          }
        },
        fail: reject
      });
    });
  });
}

module.exports = {
  isConfigured,
  recognize
};