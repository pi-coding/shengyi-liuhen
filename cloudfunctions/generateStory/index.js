const cloud = require('wx-server-sdk');
const https = require('https');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const DEFAULT_API_URL = '__LLM_API_URL__';
const DEFAULT_MODEL = 'deepseek-v4-flash';

const SYSTEM_PROMPT = '把下面老人口述的方言口语，整理成第一人称回忆录，划分章节，保留情感，不要过度润色，为每章配上小标题，适配图文排版。只返回 JSON，不要任何额外说明。JSON 结构：{"title":"总标题","chapters":[{"heading":"小标题","paragraphs":["段落一","段落二"]}]}';

function requestLLM(apiUrl, apiKey, model, text) {
  return new Promise((resolve, reject) => {
    const target = new URL(apiUrl);
    const body = JSON.stringify({
      model,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: text }
      ],
      temperature: 0.6,
      max_tokens: 4000
    });
    const req = https.request({
      hostname: target.hostname,
      port: target.port || 443,
      path: `${target.pathname}${target.search}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`
      }
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          const choice = parsed.choices && parsed.choices[0];
          const message = (choice && choice.message) || {};
          resolve(message.content || '');
        } catch (err) {
          reject(err);
        }
      });
    });
    req.setTimeout(55000, () => {
      req.destroy(new Error('大模型请求超时'));
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

function extractJSON(raw) {
  if (!raw) return null;
  const cleaned = raw.replace(/```json/gi, '').replace(/```/g, '').trim();
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start === -1 || end === -1) return null;
  try {
    return JSON.parse(cleaned.slice(start, end + 1));
  } catch (err) {
    return null;
  }
}

function localFallback(text) {
  const sentences = (text || '')
    .split(/[。！？!?\n]/)
    .map((s) => s.trim())
    .filter(Boolean);
  const chapters = [];
  const CHUNK = 4;
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
    chapters
  };
}

exports.main = async (event) => {
  const { text = '' } = event;
  const apiUrl = process.env.LLM_API_URL || (DEFAULT_API_URL.indexOf('__') === 0 ? '' : DEFAULT_API_URL);
  const apiKey = process.env.LLM_API_KEY || '';
  const model = process.env.LLM_MODEL || DEFAULT_MODEL;

  if (text && apiUrl && apiKey) {
    try {
      const raw = await requestLLM(apiUrl, apiKey, model, text);
      const story = extractJSON(raw);
      if (story && Array.isArray(story.chapters) && story.chapters.length) {
        return {
          title: story.title || '一段回忆',
          chapters: story.chapters,
          source: 'llm'
        };
      }
      console.error('大模型返回内容无法解析为故事结构');
    } catch (err) {
      console.error('大模型调用失败，改用本地降级', err);
    }
  }

  const story = localFallback(text);
  return { title: story.title, chapters: story.chapters, source: 'fallback' };
};