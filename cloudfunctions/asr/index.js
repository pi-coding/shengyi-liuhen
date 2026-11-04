const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

exports.main = async (event) => {
  const { fileID = '' } = event;
  const configured = Boolean(process.env.ASR_SECRET_ID && process.env.ASR_SECRET_KEY);

  if (!configured) {
    return {
      text: '',
      mock: true,
      message: '腾讯云语音识别未配置，请在前端引导用户手动补充文字'
    };
  }

  return {
    text: '',
    mock: true,
    fileID,
    message: '请在此处接入腾讯云方言 ASR：下载 fileID 音频后调用一句话识别接口，返回识别文本'
  };
};