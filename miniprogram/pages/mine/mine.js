const { formatDate } = require('../../utils/util');
const store = require('../../utils/store');

Page({
  data: {
    stories: [],
    loading: false
  },
  onShow() {
    this.loadMine();
  },
  async loadMine() {
    this.setData({ loading: true });
    try {
      const list = await store.listStories();
      this.setData({
        stories: list.map((s) => ({
          _id: s._id,
          title: s.title || '未命名故事',
          dateText: formatDate(s.createdAt)
        }))
      });
    } catch (err) {
      console.warn('我的故事加载失败', err);
      this.setData({ stories: [] });
    } finally {
      this.setData({ loading: false });
    }
  },
  openStory(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/story/story?id=${id}` });
  },
  onDelete(e) {
    const id = e.currentTarget.dataset.id;
    wx.showModal({
      title: '删除回忆录',
      content: '删除后无法恢复，确定继续吗？',
      confirmText: '删除',
      confirmColor: '#B5502A',
      success: async (res) => {
        if (!res.confirm) return;
        try {
          await store.removeStory(id);
          this.loadMine();
          wx.showToast({ title: '已删除', icon: 'success' });
        } catch (err) {
          console.warn('删除失败', err);
          wx.showToast({ title: '删除失败', icon: 'none' });
        }
      }
    });
  },
  onExport() {
    wx.showToast({ title: '长图导出将在下一版本开放', icon: 'none' });
  },
  goRecord() {
    wx.navigateTo({ url: '/pages/record/record' });
  }
});