const { formatDate } = require('../../utils/util');
const store = require('../../utils/store');

Page({
  data: {
    stories: [],
    currentId: '',
    comments: [],
    input: '',
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
          dateText: formatDate(s.createdAt)
        }))
      });
    } catch (err) {
      console.warn('家族记忆加载失败', err);
      this.setData({ stories: [] });
    } finally {
      this.setData({ loading: false });
    }
  },
  selectStory(e) {
    const id = e.currentTarget.dataset.id;
    if (this.data.currentId === id) {
      this.setData({ currentId: '', comments: [], input: '' });
      return;
    }
    this.setData({ currentId: id, comments: [], input: '' });
    this.loadComments(id);
  },
  async loadComments(id) {
    try {
      const comments = await store.listComments(id);
      this.setData({ comments });
    } catch (err) {
      console.warn('留言加载失败', err);
    }
  },
  onInput(e) {
    this.setData({ input: e.detail.value });
  },
  async onSubmitComment() {
    const content = (this.data.input || '').trim();
    if (!content) return;
    const storyId = this.data.currentId;
    try {
      await store.addComment(storyId, content);
      this.setData({ input: '' });
      this.loadComments(storyId);
    } catch (err) {
      console.warn('留言失败', err);
      wx.showToast({ title: '留言失败，请重试', icon: 'none' });
    }
  },
  openStory(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/story/story?id=${id}` });
  },
  onShareAppMessage() {
    return {
      title: '来看看我们家的回忆录',
      path: '/pages/index/index'
    };
  }
});