# Работа с большими файлами в Git/GitHub

## 🚫 Проблема

GitHub имеет ограничение на размер файлов - **100 МБ**. При попытке отправить файлы больше этого размера возникает ошибка:

```
remote: error: File dist/Speak-Translator Setup 0.1.0.exe is 151.11 MB; this exceeds GitHub's file size limit of 100.00 MB
remote: error: GH001: Large files detected.
```

## ✅ Решение

### 1. Добавить папку в .gitignore

```gitignore
# production
/build
/dist
```

### 2. Удалить файлы из Git (если уже добавлены)

```bash
# Удалить папку из индекса Git
git rm -r --cached dist/

# Добавить .gitignore
git add .gitignore

# Создать коммит
git commit -m "Remove dist folder from git and add to gitignore"
```

### 3. Очистить историю Git (если файлы уже в истории)

```bash
# Переписать историю без папки dist
git filter-branch --force --index-filter "git rm --cached --ignore-unmatch -r dist/" --prune-empty --tag-name-filter cat -- --all

# Принудительно отправить
git push --force-with-lease --set-upstream origin main

# Очистить локальные ссылки
git reflog expire --expire=now --all
git gc --prune=now --aggressive
```

## 📦 Что НЕ должно быть в Git

### Папки сборки:
- `dist/` - готовые сборки Electron
- `build/` - сборки Next.js
- `.next/` - кэш Next.js
- `out/` - статический экспорт

### Файлы зависимостей:
- `node_modules/` - npm пакеты
- `.pnp.*` - Plug'n'Play файлы

### Локальные файлы:
- `.env*` - переменные окружения
- `*.log` - логи
- `.DS_Store` - macOS системные файлы

## 🎯 Рекомендации

### Для Electron приложений:
```gitignore
# Electron builds
/dist
/build
*.exe
*.dmg
*.deb
*.rpm
*.snap
```

### Для Next.js:
```gitignore
# Next.js
.next/
out/
build/

# Environment variables
.env.local
.env.development.local
.env.test.local
.env.production.local
```

### Для общих проектов:
```gitignore
# Dependencies
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Production builds
dist/
build/

# Environment
.env*

# IDE
.vscode/
.idea/

# OS
.DS_Store
Thumbs.db
```

## 🔧 Альтернативные решения

### Git LFS (Large File Storage)
Если нужно хранить большие файлы в Git:

```bash
# Установить Git LFS
git lfs install

# Добавить типы файлов
git lfs track "*.exe"
git lfs track "*.dmg"
git lfs track "*.zip"

# Сохранить .gitattributes
git add .gitattributes
git commit -m "Add Git LFS tracking"
```

### GitHub Releases
Для готовых сборок используйте GitHub Releases:
- Создайте релиз с тегом
- Загрузите файлы как assets
- Ссылайтесь на них в README

## 📊 Результат

После очистки:
- **Размер репозитория**: Уменьшился с 369 МБ до 769 КБ
- **Все файлы dist**: Удалены из истории Git
- **Будущие сборки**: Не будут попадать в Git благодаря .gitignore
- **GitHub**: Принял репозиторий без ошибок

## ⚠️ Важные замечания

1. **Резервная копия**: Перед переписыванием истории сделайте backup
2. **Сотрудники**: Сообщите команде о необходимости перезагрузить репозиторий
3. **Force push**: Используйте `--force-with-lease` вместо `--force`
4. **Регулярная проверка**: Проверяйте размер файлов перед коммитом

## 🚀 Проверка размера файлов

```bash
# Показать размер файлов в репозитории
git ls-files | xargs du -sh | sort -hr | head -10

# Показать размер папки
du -sh dist/
```

Теперь репозиторий чист и готов к использованию!
