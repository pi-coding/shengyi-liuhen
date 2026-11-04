const store = require('../../utils/store');

const MAX_DURATION = 60 * 1000;

Page({
  data: {
    phase: 'idle',
    seconds: 0,
    timerId: null,
    text: '',
    fileID: '',
    statusText: '按住下方按钮，慢慢讲述您的往事'
  },
  onLoad() {
    this.recorderManager = wx.getRecorderManager();
    this.recorderManager.onStop((res) => this.handleRecordStop(res));
    this.recorderManager.onError((err) => {
      console.error('录音失败', err);
      this.setData({ phase: 'idle', statusText: '录音失败，请检查麦克风权限后重试' });
    });
  },
  onUnload() {
    this.clearTimer();
  },
  clearTimer() {
    if (this.data.timerId) {
      clearInterval(this.data.timerId);
      this.setData({ timerId: null });
    }
  },
  onRecordStart() {
    if (!['idle', 'editing'].includes(this.data.phase)) return;
    this.setData({ phase: 'recording', seconds: 0, statusText: '正在聆听，松手即可结束' });
    this.recorderManager.start({
      duration: MAX_DURATION,
      format: 'wav',
      sampleRate: 16000,
      numberOfChannels: 1
    });
    const timerId = setInterval(() => {
      this.setData({ seconds: this.data.seconds + 1 });
    }, 1000);
    this.setData({ timerId });
  },
  onRecordEnd() {
    if (this.data.phase !== 'recording') return;
    this.clearTimer();
    this.recorderManager.stop();
  },
  async handleRecordStop(res) {
    if (!res || !res.tempFilePath) {
      this.setData({ phase: 'idle' });
      return;
    }
    this.setData({ phase: 'uploading', statusText: '正在保存录音…' });
    const fileID = await store.uploadFile(res.tempFilePath, 'raw-audio', 'wav');
    this.setData({ fileID });
    this.setData({ phase: 'transcribing', statusText: '正在识别您的讲述…' });
    let text = '';
    try {
      const asr = await store.transcribe(fileID, res.tempFilePath);
      text = (asr && asr.text) || '';
    } catch (err) {
      console.warn('语音识别不可用，转入手动编辑', err);
    }
    this.setData({
      text,
      phase: 'editing',
      statusText: text ? '已听清您的话，可修改后生成故事' : '自动识别未生效，请补写讲述内容'
    });
  },
  onTextInput(e) {
    this.setData({ text: e.detail.value });
  },
  async onGenerate() {
    const text = (this.data.text || '').trim();
    if (!text) {
      wx.showToast({ title: '请先补写讲述内容', icon: 'none' });
      return;
    }
    this.setData({ phase: 'generating', statusText: 'AI 正在整理您的故事…' });
    try {
      const story = await store.generateStory(text);
      const id = await store.createStory({
        title: (story && story.title) || '未命名故事',
        chapters: (story && story.chapters) || [],
        summary: story && story.chapters && story.chapters[0] && story.chapters[0].paragraphs[0] || '',
        coverPhoto: '',
        rawAudioFileID: this.data.fileID,
        voiceFileID: '',
        template: 'book'
      });
      this.setData({ phase: 'idle', statusText: '按住下方按钮，慢慢讲述您的往事' });
      const aiUsed = story && story.source === 'llm';
      wx.showToast({
        title: aiUsed ? 'AI 整理完成' : '已生成（本地分段）',
        icon: 'success'
      });
      wx.navigateTo({ url: `/pages/story/story?id=${id}` });
    } catch (err) {
      console.error('生成故事失败', err);
      this.setData({ phase: 'editing', statusText: '生成失败，请重试' });
      wx.showToast({ title: '生成失败，请重试', icon: 'none' });
    }
  },
  onRedo() {
    this.setData({
      phase: 'idle',
      text: '',
      fileID: '',
      seconds: 0,
      statusText: '按住下方按钮，慢慢讲述您的往事'
    });
  }
});