const express = require('express');
const cors = require('cors');
const path = require('path');
const urlDatabase = require('./data.js');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());

app.use(express.static(path.join(__dirname, 'client')));

app.get('/api/urls', (req, res) => {
  const { keyword } = req.query;

  if (!keyword) {
    return res.status(400).json({ error: 'Ключевое слово не указано' });
  }

  const urls = urlDatabase[keyword.toLowerCase()];

  if (urls) {
    res.json(urls);
  } else {
    res.status(404).json({ error: 'Ключевое слово не найдено' });
  }
});

app.get('/api/download', async (req, res) => {
  const { url: targetUrl } = req.query;

  if (!targetUrl) {
    return res.status(400).json({ error: 'URL не указан' });
  }
  
  const allAllowedUrls = Object.values(urlDatabase).flat();
  if (!allAllowedUrls.includes(targetUrl)) {
    return res.status(403).json({ error: 'Запрещено скачивать контент с этого URL' });
  }

  try {
    const fetch = (await import('node-fetch')).default;
    
    const response = await fetch(targetUrl);

    if (!response.ok) {
        throw new Error(`Ошибка при запросе к ${targetUrl}: ${response.statusText}`);
    }

    const contentType = response.headers.get('content-type');
    const contentLength = response.headers.get('content-length');

    res.setHeader('Content-Type', contentType);
    if (contentLength) {
        res.setHeader('Content-Length', contentLength);
    }
    
    response.body.pipe(res);

  } catch (error) {
    console.error('Ошибка при проксировании запроса:', error.message);
    res.status(502).json({ error: 'Не удалось загрузить контент. Внешний ресурс может быть недоступен.' });
  }
});


app.listen(PORT, () => {
  console.log(`Сервер запущен и слушает порт ${PORT}`);
  console.log(`Клиент доступен по адресу http://localhost:${PORT}`);
});