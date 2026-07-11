interface DemoTemplate {
    title: string;
    content: { type: string; data: string }[];
    tagNames: string[];
}

export const templatesData: DemoTemplate[] = [
    {
        title: 'Настройка Wi-Fi роутера',
        content: [
            {
                type: 'text',
                data: '1. Подключитесь к роутеру по кабелю.\n2. Войдите в веб-интерфейс по адресу 192.168.1.1.\n3. Введите логин и пароль (обычно admin/admin).\n4. Задайте имя сети (SSID) и пароль (WPA2).\n5. Сохраните настройки и перезагрузите роутер.',
            },
        ],
        tagNames: ['Сети', 'Электроника'],
    },
    {
        title: 'Сборка системного блока',
        content: [
            {
                type: 'text',
                data: '1. Установите материнскую плату в корпус.\n2. Вставьте процессор в сокет, закрепите кулер.\n3. Установите планки ОЗУ в слоты.\n4. Подключите блок питания к материнской плате и устройствам.\n5. Установите видеокарту и подключите монитор.',
            },
        ],
        tagNames: ['Электроника', 'Автоматизация'],
    },
    {
        title: 'Создание таблицы в PostgreSQL',
        content: [
            {
                type: 'text',
                data: '1. Подключитесь к базе: psql -U postgres.\n2. Создайте БД: CREATE DATABASE mydb;\n3. Переключитесь: \\c mydb;\n4. Создайте таблицу: CREATE TABLE users (id SERIAL PRIMARY KEY, name VARCHAR(50));\n5. Проверьте: \\dt.',
            },
        ],
        tagNames: ['Программирование', 'Базы данных'],
    },
    {
        title: 'Инициализация Git-репозитория',
        content: [
            {
                type: 'text',
                data: '1. Установите Git.\n2. В папке проекта выполните: git init.\n3. Настройте пользователя: git config --global user.name "Ваше имя".\n4. Добавьте файлы: git add .\n5. Сделайте коммит: git commit -m "Initial commit".',
            },
        ],
        tagNames: ['Программирование', 'DevOps'],
    },
    {
        title: 'Настройка пользователей в Linux',
        content: [
            {
                type: 'text',
                data: '1. Создайте пользователя: sudo useradd -m newuser.\n2. Установите пароль: sudo passwd newuser.\n3. Добавьте в группу: sudo usermod -aG sudo newuser.\n4. Проверьте: id newuser.',
            },
        ],
        tagNames: ['Базы данных', 'Безопасность'],
    },
    {
        title: 'Развертывание контейнера Docker',
        content: [
            {
                type: 'text',
                data: '1. Напишите Dockerfile.\n2. Соберите образ: docker build -t myapp .\n3. Запустите контейнер: docker run -d -p 8080:80 myapp.\n4. Проверьте: docker ps.',
            },
        ],
        tagNames: ['DevOps', 'Безопасность'],
    },
    {
        title: 'Подключение к серверу по SSH',
        content: [
            {
                type: 'text',
                data: '1. Откройте терминал.\n2. Напишите: ssh user@server_ip.\n3. Введите пароль.\n4. Выполните команды на сервере.',
            },
        ],
        tagNames: ['Сети', 'Сервер'],
    },
    {
        title: 'Настройка веб-сервера Nginx',
        content: [
            {
                type: 'text',
                data: '1. Установите Nginx: sudo apt install nginx.\n2. Отредактируйте /etc/nginx/sites-available/default.\n3. Пропишите root директорию.\n4. Проверьте конфиг: sudo nginx -t.\n5. Перезапустите: sudo systemctl restart nginx.',
            },
        ],
        tagNames: ['Сервер', 'Веб-разработка'],
    },
    {
        title: 'Разработка REST API на Express',
        content: [
            {
                type: 'text',
                data: '1. Установите Node.js и npm.\n2. Инициализируйте проект: npm init -y.\n3. Установите Express: npm install express.\n4. Создайте app.js с маршрутами.\n5. Запустите: node app.js.',
            },
        ],
        tagNames: ['Веб-разработка', 'Архитектура'],
    },
    {
        title: 'Настройка сетевого хранилища (NAS)',
        content: [
            {
                type: 'text',
                data: '1. Подключите жёсткий диск к NAS.\n2. Войдите в веб-интерфейс NAS.\n3. Создайте том (volume).\n4. Настройте общие папки и права доступа.\n5. Проверьте доступ по сети.',
            },
        ],
        tagNames: ['Архитектура', 'Автоматизация'],
    },
];
