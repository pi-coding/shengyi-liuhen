const store = require('../../utils/store');
const { VOICE_TYPES } = require('../../utils/util');

Page({
  data: {
    story: null,
    fullText: '',
    voiceTypes: VOICE_TYPES,
    voiceIndex: 0,
    voiceFileID: '',
    hasRaw: false,
    ttsReady: false,
    playing: false,
    generating: false,
    statusText: '尚未生成声音'
  },
  onLoad(options) {
    this.storyId = options.id || '';
    this.rawFileID = '';
    this.ttsUrls = [];
    this.ttsIndex = 0;
    this.audio = wx.createInnerAudioContext();
    this.audio.onEnded(() => this.handleEnded());
    this.audio.onError((err) => {
      console.error('音频播放失败', err);
      this.setData({ playing: false, statusText: '音频播放失败' });
    });
    this.loadStory();
  },
  onUnload() {
    if (this.audio) {
      this.audio.stop();
      this.audio.destroy();
    }
  },
  handleEnded() {
    if (this.ttsUrls.length && this.ttsIndex + 1 < this.ttsUrls.length) {
      this.playTtsFrom(this.ttsIndex + 1);
      return;
    }
    this.setData({ playing: false, statusText: '朗读播放完毕' });
  },
  async loadStory() {
    try {
      const story = await store.getStory(this.storyId);
      this.rawFileID = (story && story.rawAudioFileID) || '';
      this.applyStory(story || {});
    } catch (err) {
      console.warn('加载故事失败，使用示例文本', err);
      this.applyStory({
        title: '示例回忆录',
        chapters: [{ heading: '', paragraphs: ['这是一段示例回忆录文本，用于演示语音朗读功能。'] }]
      });
    }
  },
  applyStory(story) {
    const chapters = story.chapters || [];
    const fullText = chapters
      .map((c) => `${c.heading || ''}。${(c.paragraphs || []).join('')}`)
      .join('\n');
    this.setData({
      story,
      fullText,
      voiceFileID: story.voiceFileID || '',
      hasRaw: Boolean(this.rawFileID),
      statusText: story.voiceFileID ? '点击播放即可收听' : '点击播放即可朗读'
    });
  },
  onVoiceChange(e) {
    this.setData({ voiceIndex: Number(e.detail.value) });
  },
  playTtsFrom(index) {
    if (index >= this.ttsUrls.length) {
      this.setData({ playing: false, statusText: '朗读播放完毕' });
      return;
    }
    this.ttsIndex = index;
    this.audio.src = this.ttsUrls[index];
    this.audio.play();
    this.setData({ playing: true, statusText: `正在朗读 ${index + 1}/${this.ttsUrls.length}` });
  },
  async onGenerateVoice() {
    if (!this.data.fullText) {
      wx.showToast({ title: '暂无可朗读内容', icon: 'none' });
      return;
    }
    this.setData({ generating: true, statusText: '正在生成有声音频…' });
    try {
      const res = await store.synthesize(
        this.data.fullText,
        VOICE_TYPES[this.data.voiceIndex].value,
        this.storyId
      );
      if (res && res.fileID) {
        this.setData({ voiceFileID: res.fileID, statusText: '生成完成，点击播放收听' });
        await store.updateStory(this.storyId, { voiceFileID: res.fileID });
      } else if (res && res.urls && res.urls.length) {
        this.ttsUrls = res.urls;
        this.setData({ ttsReady: true });
        this.playTtsFrom(0);
      } else if (this.rawFileID) {
        this.audio.src = this.rawFileID;
        this.audio.play();
        this.setData({ playing: true, statusText: '正在播放原始录音' });
      } else {
        this.setData({ statusText: '暂无可用音频' });
        wx.showToast({ title: '朗读生成失败', icon: 'none' });
      }
    } catch (err) {
      console.warn('语音生成失败', err);
      this.setData({ statusText: '语音生成失败，请重试' });
      wx.showToast({ title: '生成失败，请重试', icon: 'none' });
    } finally {
      this.setData({ generating: false });
    }
  },
  togglePlay() {
    if (this.data.generating) return;
    if (this.data.playing) {
      this.audio.pause();
      this.setData({ playing: false, statusText: '已暂停' });
      return;
    }
    if (this.data.voiceFileID) {
      this.audio.src = this.data.voiceFileID;
      this.audio.play();
      this.setData({ playing: true, statusText: '正在朗读' });
      return;
    }
    if (this.ttsUrls.length) {
      this.playTtsFrom(this.ttsIndex);
      return;
    }
    this.onGenerateVoice();
  },
  onShareAppMessage() {
    const title = (this.data.story && this.data.story.title) || '我家的回忆录';
    return { title, path: `/pages/story/story?id=${this.storyId}` };
  }
});