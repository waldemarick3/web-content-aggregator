document.addEventListener('DOMContentLoaded', () => {

    const keywordInput = document.getElementById('keyword-input');
    const searchButton = document.getElementById('search-button');
    const urlList = document.getElementById('url-list');
    const savedContentList = document.getElementById('saved-content-list');
    const contentDisplay = document.getElementById('content-display');
    const noSavedContentMsg = document.getElementById('no-saved-content');
    
    const resultsSection = document.getElementById('results-section');
    const statusSection = document.getElementById('status-section');
    const contentDisplaySection = document.getElementById('content-display-section');
    const errorSection = document.getElementById('error-section');

    const downloadStatusText = document.getElementById('download-status-text');
    const downloadProgress = document.getElementById('download-progress');
    const errorMessage = document.getElementById('error-message');

    const API_BASE_URL = '';

    const showElement = (el) => el.classList.remove('hidden');
    const hideElement = (el) => el.classList.add('hidden');

    const displayError = (message) => {
        errorMessage.textContent = message;
        showElement(errorSection);
    };

    const clearError = () => {
        errorMessage.textContent = '';
        hideElement(errorSection);
    };

    const updateProgress = (loaded, total) => {
        if (total) {
            const percentComplete = Math.round((loaded / total) * 100);
            downloadProgress.value = percentComplete;
            downloadStatusText.textContent = `Загружено ${Math.round(loaded / 1024)} КБ из ${Math.round(total / 1024)} КБ (${percentComplete}%)`;
        } else {
            downloadStatusText.textContent = `Загружено ${Math.round(loaded / 1024)} КБ`;
        }
    };

    const renderRssFeed = (xmlString, container) => {
        container.innerHTML = '';
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlString, "application/xml");
        
        const parseError = xmlDoc.querySelector("parsererror");
        if (parseError) {
            console.error("Ошибка парсинга RSS:", parseError);
            container.textContent = xmlString; 
            return;
        }

        const items = xmlDoc.querySelectorAll("item");
        items.forEach(item => {
            const title = item.querySelector("title")?.textContent || 'Без заголовка';
            const link = item.querySelector("link")?.textContent;
            const description = item.querySelector("description")?.textContent || '';
            const pubDate = item.querySelector("pubDate")?.textContent;

            const itemDiv = document.createElement('div');
            itemDiv.className = 'rss-item';

            let titleElement;
            if (link) {
                titleElement = document.createElement('a');
                titleElement.href = link;
                titleElement.target = '_blank';
                titleElement.rel = 'noopener noreferrer';
                titleElement.textContent = title;
            } else {
                titleElement = document.createElement('span');
                titleElement.textContent = title;
            }
            titleElement.className = 'rss-title';

            const descriptionElement = document.createElement('p');
            descriptionElement.className = 'rss-description';
            descriptionElement.innerHTML = description;

            itemDiv.appendChild(titleElement);

            if (pubDate) {
                const dateElement = document.createElement('p');
                dateElement.className = 'rss-date';
                dateElement.textContent = new Date(pubDate).toLocaleString('ru-RU');
                itemDiv.appendChild(dateElement);
            }

            itemDiv.appendChild(descriptionElement);
            container.appendChild(itemDiv);
        });
    };

    const handleSearch = async () => {
        clearError();
        hideElement(resultsSection);
        const keyword = keywordInput.value.trim();
        if (!keyword) {
            displayError('Пожалуйста, введите ключевое слово.');
            return;
        }

        searchButton.disabled = true;
        searchButton.textContent = 'Ищем...';

        try {
            const response = await fetch(`${API_BASE_URL}/api/urls?keyword=${encodeURIComponent(keyword)}`);
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Неизвестная ошибка сервера');
            }
            const urls = await response.json();
            displayUrls(urls);
        } catch (error) {
            displayError(`Ошибка при поиске: ${error.message}`);
        } finally {
            searchButton.disabled = false;
            searchButton.textContent = 'Найти URL';
        }
    };

    const displayUrls = (urls) => {
        urlList.innerHTML = '';
        if (urls.length === 0) {
            urlList.innerHTML = '<li>По этому ключевому слову ничего не найдено.</li>';
        } else {
            urls.forEach(url => {
                const li = document.createElement('li');
                const urlSpan = document.createElement('span');
                urlSpan.textContent = url;
                const downloadButton = document.createElement('button');
                downloadButton.textContent = 'Скачать';
                downloadButton.dataset.url = url;
                li.appendChild(urlSpan);
                li.appendChild(downloadButton);
                urlList.appendChild(li);
            });
        }
        showElement(resultsSection);
    };

    const handleDownload = async (url) => {
        clearError();
        hideElement(contentDisplaySection);
        showElement(statusSection);
        updateProgress(0, 0);

        try {
            const response = await fetch(`${API_BASE_URL}/api/download?url=${encodeURIComponent(url)}`);
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Не удалось начать загрузку.');
            }

            const reader = response.body.getReader();
            const contentLength = +response.headers.get('Content-Length');
            let receivedLength = 0;
            const chunks = [];

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                
                chunks.push(value);
                receivedLength += value.length;
                updateProgress(receivedLength, contentLength);
            }
            
            const contentBlob = new Blob(chunks);
            const contentText = await contentBlob.text();
            
            localStorage.setItem(url, contentText);
            
            alert('Контент успешно скачан и сохранен!');
            displaySavedContentList();

        } catch (error) {
            displayError(`Ошибка при загрузке: ${error.message}`);
        } finally {
            hideElement(statusSection);
        }
    };

    const displaySavedContentList = () => {
        savedContentList.innerHTML = '';
        const keys = Object.keys(localStorage);

        if (keys.length === 0) {
            showElement(noSavedContentMsg);
            hideElement(savedContentList);
            return;
        }

        hideElement(noSavedContentMsg);
        showElement(savedContentList);

        keys.forEach(key => {
            const li = document.createElement('li');
            const urlSpan = document.createElement('span');
            urlSpan.textContent = key;
            const buttonsDiv = document.createElement('div');
            const viewButton = document.createElement('button');
            viewButton.textContent = 'Показать';
            viewButton.dataset.key = key;
            viewButton.classList.add('view-btn');
            const deleteButton = document.createElement('button');
            deleteButton.textContent = 'Удалить';
            deleteButton.dataset.key = key;
            deleteButton.classList.add('delete-btn');
            buttonsDiv.appendChild(viewButton);
            buttonsDiv.appendChild(deleteButton);
            li.appendChild(urlSpan);
            li.appendChild(buttonsDiv);
            savedContentList.appendChild(li);
        });
    };

    searchButton.addEventListener('click', handleSearch);

    document.body.addEventListener('click', (event) => {
        const target = event.target;
        
        if (target.matches('#url-list button')) {
            const urlToDownload = target.dataset.url;
            handleDownload(urlToDownload);
        }
        
        if (target.matches('.view-btn')) {
            const key = target.dataset.key;
            const content = localStorage.getItem(key);
            renderRssFeed(content, contentDisplay);
            showElement(contentDisplaySection);
        }

        if (target.matches('.delete-btn')) {
            const key = target.dataset.key;
            if (confirm(`Вы уверены, что хотите удалить контент для URL: ${key}?`)) {
                localStorage.removeItem(key);
                hideElement(contentDisplaySection);
                displaySavedContentList();
            }
        }
    });

    displaySavedContentList();
});