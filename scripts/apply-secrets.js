const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const root = path.resolve(__dirname, '..');
const secretsFile = path.join(root, '.secrets.local.json');

if (!fs.existsSync(secretsFile)) {
  console.error('未找到 .secrets.local.json。');
  console.error('请先复制 .secrets.local.example.json 为 .secrets.local.json，并填入你自己的密钥（该文件不会被提交）。');
  process.exit(1);
}

const secrets = JSON.parse(fs.readFileSync(secretsFile, 'utf8'));

const targets = [
  {
    file: 'miniprogram/app.js',
    values: {
      '__LLM_API_URL__': secrets.llmApiUrl,
      '__LLM_API_KEY__': secrets.llmApiKey
    }
  },
  {
    file: 'cloudfunctions/generateStory/index.js',
    values: { '__LLM_API_URL__': secrets.llmApiUrl }
  },
  {
    file: 'miniprogram/utils/asr.js',
    values: {
      '__BAIDU_API_KEY__': secrets.baiduApiKey,
      '__BAIDU_SECRET_KEY__': secrets.baiduSecretKey
    }
  }
];

const applied = [];

targets.forEach((target) => {
  const filePath = path.join(root, target.file);
  let content = fs.readFileSync(filePath, 'utf8');

  Object.entries(target.values).forEach(([marker, value]) => {
    if (!value) {
      console.warn('跳过（密钥为空）:', target.file, marker);
      return;
    }
    if (!content.includes(marker)) {
      console.warn('未找到占位符:', target.file, marker);
      return;
    }
    content = content.split(marker).join(value);
  });

  fs.writeFileSync(filePath, content);
  applied.push(target.file);
  console.log('已注入:', target.file);
});

try {
  execSync(`git update-index --skip-worktree ${applied.join(' ')}`, { cwd: root });
  console.log('已设置 skip-worktree，本地密钥不会被误提交。');
  console.log('提示：之后若需再次修改这些文件，先执行 git update-index --no-skip-worktree <文件>。');
} catch (err) {
  console.warn('skip-worktree 设置失败（可能尚未初始化仓库），请勿提交含密钥的改动。');
}