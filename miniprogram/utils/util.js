function callFunction(name, data = {}) {
  return new Promise((resolve, reject) => {
    wx.cloud.callFunction({ name, data })
      .then((res) => resolve(res.result))
      .catch((err) => reject(err));
  });
}

function uploadFile(filePath, cloudPath) {
  return new Promise((resolve, reject) => {
    wx.cloud.uploadFile({
      cloudPath,
      filePath,
      success: (res) => resolve(res.fileID),
      fail: (err) => reject(err)
    });
  });
}

function formatDate(value) {
  if (!value) return '';
  const d = value instanceof Date ? value : new Date(value);
  const pad = (n) => (n < 10 ? '0' + n : '' + n);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function formatDuration(seconds) {
  const s = Math.max(0, Math.floor(seconds || 0));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r < 10 ? '0' + r : r}`;
}

function cloudPathFor(prefix, ext) {
  const now = Date.now();
  const rand = Math.floor(Math.random() * 1e6);
  return `${prefix}/${now}-${rand}.${ext || 'mp3'}`;
}

const VOICE_TYPES = [
  { label: '温柔女声', value: 'female_gentle' },
  { label: '亲切男声', value: 'male_warm' },
  { label: '方言女声', value: 'dialect_female' },
  { label: '方言男声', value: 'dialect_male' }
];

const STORY_TEMPLATES = [
  { label: '翻书样式', value: 'book' },
  { label: '长卷样式', value: 'scroll' }
];

module.exports = {
  callFunction,
  uploadFile,
  formatDate,
  formatDuration,
  cloudPathFor,
  VOICE_TYPES,
  STORY_TEMPLATES
};