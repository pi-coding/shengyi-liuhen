const { cloudPathFor } = require('./util');

const STORY_KEY = 'demo_stories';
const COMMENT_PREFIX = 'demo_comments_';
const PHOTO_PREFIX = 'demo_photos_';

const SYSTEM_PROMPT = '把下面老人口述的方言口语，整理成第一人称回忆录，划分章节，保留情感，不要过度润色，为每章配上小标题，适配图文排版。只返回 JSON，不要任何额外说明。JSON 结构：{"title":"总标题","chapters":[{"heading":"小标题","paragraphs":["段落一","段落二"]}]}';

const BAIDU_TTS_URL = 'https://fanyi.baidu.com/gettts?lan=zh&spd=3&source=web&text=';
const TTS_SEGMENT_LEN = 80;

function globalData() {
  const app = getApp();
  return (app && app.globalData) || {};
}

function isCloud() {
  return Boolean(globalData().cloudReady);
}

function isRemoteId(id) {
  return Boolean(id) && id.indexOf('local-') !== 0 && id.indexOf('demo-') !== 0;
}

function isCloudFile(fileID) {
  return Boolean(fileID) && fileID.indexOf('cloud://') === 0;
}

function readLocal(key, fallback) {
  const value = wx.getStorageSync(key);
  return value || fallback;
}

function writeLocal(key, value) {
  wx.setStorageSync(key, value);
}

function sampleStories() {
  const now = Date.now();
  return [
    {
      _id: 'demo-1',
      title: '灶台边的年夜饭',
      summary: '那年腊月二十八，灶火映着全家人的脸，母亲一边翻着锅里的丸子，一边讲起她小时候的事……',
      coverPhoto: '',
      chapters: [
        {
          heading: '一、腊月的味道',
          paragraphs: [
            '每到腊月，我家的灶台就一天到晚都热着，屋里屋外都是香味。',
            '母亲总说，年味啊，是一点点熬出来的，急不得。'
          ]
        },
        {
          heading: '二、母亲的丸子',
          paragraphs: [
            '母亲说，丸子要剁得细，火要稳，心急做不出好味道。',
            '那口大铁锅陪了我们家几十年，也盛着一家人的念想。'
          ]
        }
      ],
      rawAudioFileID: '',
      voiceFileID: '',
      template: 'book',
      createdAt: now
    }
  ];
}

function loadedLocalStories() {
  const stored = readLocal(STORY_KEY, []) || [];
  return stored.concat(sampleStories());
}

function localFind(id) {
  return loadedLocalStories().find((s) => s._id === id) || sampleStories()[0];
}

function localCreate(payload) {
  const id = 'local-' + Date.now();
  const stored = readLocal(STORY_KEY, []) || [];
  const story = Object.assign({ _id: id, createdAt: Date.now() }, payload);
  stored.unshift(story);
  writeLocal(STORY_KEY, stored);
  return id;
}

function localUpdate(id, data) {
  const stored = readLocal(STORY_KEY, []) || [];
  const index = stored.findIndex((s) => s._id === id);
  if (index >= 0) {
    stored[index] = Object.assign({}, stored[index], data);
    writeLocal(STORY_KEY, stored);
  }
}

function localRemove(id) {
  const stored = readLocal(STORY_KEY, []) || [];
  writeLocal(STORY_KEY, stored.filter((s) => s._id !== id));
}

function localList(key) {
  return readLocal(key, []) || [];
}

function listStories() {
  if (isCloud()) {
    return wx.cloud.database().collection('stories')
      .orderBy('createdAt', 'desc')
      .limit(50)
      .get()
      .then((res) => res.data || [])
      .catch(() => loadedLocalStories());
  }
  return Promise.resolve(loadedLocalStories());
}

function getStory(id) {
  if (isCloud() && isRemoteId(id)) {
    return wx.cloud.database().collection('stories').doc(id).get()
      .then((res) => res.data)
      .catch(() => localFind(id));
  }
  return Promise.resolve(localFind(id));
}

function createStory(payload) {
  if (isCloud()) {
    const db = wx.cloud.database();
    return db.collection('stories').add({
      data: Object.assign({}, payload, { createdAt: db.serverDate() })
    }).then((res) => res._id).catch(() => localCreate(payload));
  }
  return Promise.resolve(localCreate(payload));
}

function updateStory(id, data) {
  if (isCloud() && isRemoteId(id)) {
    return wx.cloud.database().collection('stories').doc(id).update({ data })
      .catch(() => localUpdate(id, data));
  }
  localUpdate(id, data);
  return Promise.resolve();
}

function removeStory(id) {
  if (isCloud() && isRemoteId(id)) {
    return wx.cloud.database().collection('stories').doc(id).remove()
      .catch(() => localRemove(id));
  }
  localRemove(id);
  return Promise.resolve();
}

function listPhotos(storyId) {
  if (isCloud() && isRemoteId(storyId)) {
    return wx.cloud.database().collection('photos')
      .where({ storyId })
      .orderBy('order', 'asc')
      .get()
      .then((res) => (res.data || []).map((p) => p.fileID))
      .catch(() => localList(PHOTO_PREFIX + storyId));
  }
  return Promise.resolve(localList(PHOTO_PREFIX + storyId));
}

function addPhoto(storyId, fileID, order) {
  const key = PHOTO_PREFIX + storyId;
  if (isCloud() && isRemoteId(storyId)) {
    const db = wx.cloud.database();
    return db.collection('photos').add({
      data: { storyId, fileID, order, createdAt: db.serverDate() }
    }).catch(() => {
      const list = localList(key);
      list.push(fileID);
      writeLocal(key, list);
    });
  }
  const list = localList(key);
  list.push(fileID);
  writeLocal(key, list);
  return Promise.resolve();
}

function listComments(storyId) {
  if (isCloud() && isRemoteId(storyId)) {
    return wx.cloud.database().collection('comments')
      .where({ storyId })
      .orderBy('createdAt', 'asc')
      .get()
      .then((res) => res.data || [])
      .catch(() => localList(COMMENT_PREFIX + storyId));
  }
  return Promise.resolve(localList(COMMENT_PREFIX + storyId));
}

function addComment(storyId, content) {
  const item = { _id: 'c-' + Date.now(), storyId, content, who: '家人', createdAt: Date.now() };
  const key = COMMENT_PREFIX + storyId;
  if (isCloud() && isRemoteId(storyId)) {
    const db = wx.cloud.database();
    return db.collection('comments').add({
      data: { storyId, content, who: '家人', createdAt: db.serverDate() }
    }).catch(() => {
      const list = localList(key);
      list.push(item);
      writeLocal(key, list);
    });
  }
  const list = localList(key);
  list.push(item);
  writeLocal(key, list);
  return Promise.resolve();
}

function uploadFile(filePath, prefix, ext) {
  if (isCloud()) {
    return wx.cloud.uploadFile({
      cloudPath: cloudPathFor(prefix, ext || 'mp3'),
      filePath
    }).then((res) => res.fileID).catch(() => filePath);
  }
  return Promise.resolve(filePath);
}

function transcribe(fileID, localPath) {
  if (isCloud() && isCloudFile(fileID)) {
    return wx.cloud.callFunction({ name: 'asr', data: { fileID } })
      .then((res) => res.result)
      .catch(() => ({ text: '', mock: true }));
  }
  const asr = require('./asr');
  if (localPath && asr.isConfigured()) {
    return asr.recognize(localPath)
      .then((text) => ({ text, source: 'baidu' }))
      .catch((err) => ({ text: '', message: err.message }));
  }
  return Promise.resolve({ text: '', mock: true, message: '本地演示模式：请手动输入讲述文字' });
}

function extractJSON(raw) {
  if (!raw) return null;
  const cleaned = String(raw).replace(/```json/gi, '').replace(/```/g, '').trim();
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start === -1 || end === -1) return null;
  try {
    return JSON.parse(cleaned.slice(start, end + 1));
  } catch (err) {
    return null;
  }
}

function localGenerate(text) {
  const sentences = (text || '')
    .split(/[。！？!?\n]/)
    .map((s) => s.trim())
    .filter(Boolean);
  const chapters = [];
  const CHUNK = 3;
  for (let i = 0; i < sentences.length; i += CHUNK) {
    chapters.push({
      heading: `第${chapters.length + 1}段回忆`,
      paragraphs: [sentences.slice(i, i + CHUNK).join('。') + '。']
    });
  }
  if (!chapters.length) {
    chapters.push({ heading: '回忆', paragraphs: [text || ''] });
  }
  return {
    title: sentences[0] ? sentences[0].slice(0, 16) : '一段回忆',
    chapters,
    source: 'local'
  };
}

function requestLLM(text) {
  const g = globalData();
  const key = g.llmApiKey;
  if (!key) return Promise.reject(new Error('未配置前端大模型密钥'));
  return new Promise((resolve, reject) => {
    wx.request({
      url: g.llmApiUrl,
      method: 'POST',
      timeout: 55000,
      header: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + key
      },
      data: {
        model: g.llmModel,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: text }
        ],
        temperature: 0.6,
        max_tokens: 4000
      },
      success: (res) => {
        const choice = res.data && res.data.choices && res.data.choices[0];
        const content = choice && choice.message && choice.message.content;
        const story = extractJSON(content);
        if (story && Array.isArray(story.chapters) && story.chapters.length) {
          resolve({ title: story.title || '一段回忆', chapters: story.chapters, source: 'llm' });
        } else {
          reject(new Error('大模型返回无法解析'));
        }
      },
      fail: reject
    });
  });
}

function generateStory(text) {
  if (isCloud()) {
    return wx.cloud.callFunction({ name: 'generateStory', data: { text } })
      .then((res) => res.result)
      .catch(() => localGenerate(text));
  }
  return requestLLM(text).catch(() => localGenerate(text));
}

function buildBaiduTtsUrls(text) {
  const clean = String(text || '').replace(/\s+/g, ' ').trim();
  if (!clean) return [];
  const urls = [];
  for (let i = 0; i < clean.length; i += TTS_SEGMENT_LEN) {
    urls.push(BAIDU_TTS_URL + encodeURIComponent(clean.slice(i, i + TTS_SEGMENT_LEN)));
  }
  return urls;
}

function synthesize(text, voiceType, storyId) {
  const fallback = () => {
    const urls = buildBaiduTtsUrls(text);
    return urls.length
      ? { fileID: '', mock: false, urls }
      : { fileID: '', mock: true, message: '暂无可朗读内容' };
  };
  if (isCloud()) {
    return wx.cloud.callFunction({ name: 'tts', data: { text, voiceType, storyId } })
      .then((res) => (res.result && res.result.fileID ? res.result : fallback()))
      .catch(() => fallback());
  }
  return Promise.resolve(fallback());
}

module.exports = {
  isCloud,
  listStories,
  getStory,
  createStory,
  updateStory,
  removeStory,
  listPhotos,
  addPhoto,
  listComments,
  addComment,
  uploadFile,
  transcribe,
  generateStory,
  synthesize
};