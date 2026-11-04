const { formatDate, STORY_TEMPLATES } = require('../../utils/util');
const store = require('../../utils/store');

Page({
  data: {
    story: null,
    chapters: [],
    photos: [],
    dateText: '',
    template: 'book',
    templates: STORY_TEMPLATES,
    loading: true
  },
  onLoad(options) {
    this.storyId = options.id || '';
    this.loadStory();
  },
  async loadStory() {
    this.setData({ loading: true });
    try {
      const story = await store.getStory(this.storyId);
      const photos = await store.listPhotos(this.storyId);
      this.setData({ story, photos });
      this.applyStory(story || {});
    } catch (err) {
      console.warn('故事加载失败，展示示例内容', err);
      this.applyStory({
        title: '一段回忆',
        createdAt: Date.now(),
        chapters: [{ heading: '', paragraphs: ['暂无内容。'] }]
      });
    } finally {
      this.setData({ loading: false });
    }
  },
  applyStory(story) {
    const chapters = (story.chapters || []).map((c) => ({
      heading: c.heading || '',
      paragraphs: c.paragraphs || []
    }));
    this.setData({
      story,
      chapters,
      template: story.template || 'book',
      dateText: formatDate(story.createdAt)
    });
  },
  switchTemplate(e) {
    this.setData({ template: e.currentTarget.dataset.value });
  },
  async onAddPhoto() {
    let media;
    try {
      media = await new Promise((resolve, reject) => {
        wx.chooseMedia({ count: 9, mediaType: ['image'], success: resolve, fail: reject });
      });
    } catch (err) {
      return;
    }
    const files = media.tempFiles || [];
    if (!files.length) return;
    wx.showLoading({ title: '上传中…' });
    try {
      const baseIndex = this.data.photos.length;
      const uploaded = [];
      for (let i = 0; i < files.length; i++) {
        const fileID = await store.uploadFile(files[i].tempFilePath, 'photos', 'jpg');
        uploaded.push(fileID);
        await store.addPhoto(this.storyId, fileID, baseIndex + i);
      }
      this.setData({ photos: this.data.photos.concat(uploaded) });
    } catch (err) {
      console.warn('照片上传失败', err);
      wx.showToast({ title: '照片添加失败', icon: 'none' });
    } finally {
      wx.hideLoading();
    }
  },
  goPlay() {
    wx.navigateTo({ url: `/pages/play/play?id=${this.storyId}` });
  },
  onShareAppMessage() {
    const title = (this.data.story && this.data.story.title) || '我家的回忆录';
    return {
      title,
      path: `/pages/story/story?id=${this.storyId}`
    };
  }
});