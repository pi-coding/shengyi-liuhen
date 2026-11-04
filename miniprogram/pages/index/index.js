const store = require('../../utils/store');
const { formatDate } = require('../../utils/util');

Page({
  data: {
    stories: [],
    loading: false
  },
  onShow() {
    this.loadStories();
  },
  async loadStories() {
    this.setData({ loading: true });
    try {
      const list = await store.listStories();
      this.setData({
        stories: list.map((s) => ({
          _id: s._id,
          title: s.title || '未命名故事',
          summary: s.summary || '',
          coverPhoto: s.coverPhoto || '',
          dateText: formatDate(s.createdAt)
        }))
      });
    } catch (err) {
      console.warn('故事列表加载失败', err);
      this.setData({ stories: [] });
    } finally {
      this.setData({ loading: false });
    }
  },
  goRecord() {
    wx.navigateTo({ url: '/pages/record/record' });
  },
  openStory(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/story/story?id=${id}` });
  },
  goFamily() {
    wx.navigateTo({ url: '/pages/family/family' });
  },
  goMine() {
    wx.navigateTo({ url: '/pages/mine/mine' });
  },
  onShareAppMessage() {
    return {
      title: '声忆留痕 · 帮长辈留存一生的故事',
      path: '/pages/index/index'
    };
  }
});