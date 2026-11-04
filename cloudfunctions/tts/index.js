const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

exports.main = async (event) => {
  const { text = '', voiceType = 'female_gentle', storyId = '' } = event;
  const configured = Boolean(process.env.TTS_SECRET_ID && process.env.TTS_SECRET_KEY);

  if (!configured) {
    return {
      fileID: '',
      mock: true,
      message: '腾讯云语音合成未配置，暂以演示模式返回'
    };
  }

  return {
    fileID: '',
    mock: true,
    storyId,
    voiceType,
    textLength: text.length,
    message: '请在此处接入腾讯云 TTS：合成音频后上传云存储，返回 fileID 供前端播放'
  };
};