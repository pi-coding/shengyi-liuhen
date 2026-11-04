const CLOUD_ENV_ID = '';
const LLM_API_KEY = '__LLM_API_KEY__';
const LLM_API_URL = '__LLM_API_URL__';
const LLM_MODEL = 'deepseek-v4-flash';

App({
  globalData: {
    envId: CLOUD_ENV_ID,
    cloudReady: false,
    llmApiKey: LLM_API_KEY.indexOf('__') === 0 ? '' : LLM_API_KEY,
    llmApiUrl: LLM_API_URL.indexOf('__') === 0 ? '' : LLM_API_URL,
    llmModel: LLM_MODEL
  },
  onLaunch() {
    if (!wx.cloud || !CLOUD_ENV_ID) {
      console.warn('未配置云环境，运行于本地演示模式');
      return;
    }
    try {
      wx.cloud.init({ env: CLOUD_ENV_ID, traceUser: true });
      this.globalData.cloudReady = true;
    } catch (err) {
      this.globalData.cloudReady = false;
      console.warn('云开发初始化失败，运行于本地演示模式', err);
    }
  }
});