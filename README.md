# Тест скорости загризки документов с позициями

## Установка

```bash
npm install
```

## Авторизация

В локальный файл `.env` Необходимо заполнить параметры авторизации для аккаунтов, через которые будет происходить загрузка сущностей

`.env.example` - шаблон файла .env

## Запуск

```bash
node index.js entity=customerorder expand=positions pages=60 accounts=3
```

_Параметры:_

- `entity` - сущность которую нужно протестировать
- `expand` - (опционально) параметр `expand` запроса
- `pages` - кол-во загружаемых страниц (одна страница 100 сущностей)
- `pool` - кол-во одновременно используемых аккаунтов МойСклад

> Загрузка происходит параллельно по всем аккаунтам. Для каждого акканута параллельно выполняется по 5 запросов (согласно лимиту).

## Пример

```
$ node index.js entity=customerorder expand=positions pages=60 accounts=3
Page 1 queued (account 1)
Page 2 queued (account 2)
Page 3 queued (account 3)
Page 4 queued (account 1)
...
Page 58 queued (account 1)
Page 59 queued (account 2)
Page 60 queued (account 3)
===
Total loaded 6000 entities
Rate 32.492 ms/entity
```
