const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

exports.main = async (event) => {
  const { sampleFileID = '', text = '', storyId = '' } = event;
  const configured = Boolean(process.env.CLONE_SECRET_ID && process.env.CLONE_SECRET_KEY);

  if (!configured) {
    return {
      voiceID: '',
      fileID: '',
      mock: true,
      message: '声音复刻未开通，当前请使用通用方言音色'
    };
  }

  return {
    voiceID: '',
    fileID: '',
    mock: true,
    storyId,
    sampleFileID,
    textLength: text.length,
    message: '请在此处接入腾讯云声音复刻：上传录音样本生成专属音色，再用该音色合成整篇回忆录'
  };
};