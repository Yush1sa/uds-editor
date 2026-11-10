# Изменения относительно iD (хакатон: редактор графа УДС)

Основа: openstreetmap/iD, коммит 5b81398. Цель: открыть `.osm` → править → сохранить `.osm`.

## Что изменено в существующих файлах

| Файл | Что сделано |
|---|---|
| `modules/services/osm.js` | `_off = true` по умолчанию: нет автоподгрузки тайлов/заметок и запросов к API OSM. `isDataLoaded()` в этом режиме всегда `true` (иначе валидаторы и операции считают данные «не загруженными» и пропускают проверки). `reloadApiStatus()` ничего не делает. Включить обратно: `services.osm.toggle(true)`. |
| `modules/ui/top_toolbar.js` | Вместо кнопки «Save» (выгрузка в OSM API) стоит `uiToolOsmFile`. Добавлена кнопка GPS-трека (`uiToolGpsTrack`). |
| `modules/ui/tools/index.ts` | Экспорт новых инструментов (`uiToolOsmFile`, `uiToolGpsTrack`). |
| `modules/osm/index.ts` | Экспорт `osmXmlParse`, `osmXmlSerialize`. |
| `modules/presets/index.ts` | В `ensureLoaded()` официальная схема расширяется через `presetsWithCustom()`. |
| `modules/presets/field.ts` | Подпись поля берётся из `field.label`, если перевода нет (нужно кастомным полям). |
| `data/core.yaml` | Строки `osm_file.*` для новых кнопок. |
| `modules/presets/custom.ts` | Кастомные поля и пресеты: лавочка, беседка, типы остановок, фото, сайт, сигналы. |

## Что добавлено

| Файл | Назначение |
|---|---|
| `modules/osm/osm_xml.ts` | `osmXmlParse(text)`: OSM XML 0.6 → сущности iD. `osmXmlSerialize(graph)`: весь граф (файл + правки) → `.osm`. Новые объекты с отрицательными id перенумеровываются в положительные, удалённые не пишутся. |
| `modules/ui/tools/osm_file.js` | Кнопки «Открыть .osm» (⌘O) и «Экспорт .osm» (⌘S). Открытие сбрасывает сессию, кладёт файл в базовый граф и приближает карту. Имя файла при экспорте = имя открытого файла. |
| `modules/ui/tools/gps_track.js` | Кнопка записи GPS-трека на верхней панели (горячая клавиша `G`). |
| `modules/modes/gps_track.js` | Режим записи GPS-трека через `navigator.geolocation.watchPosition()`. |
| `modules/presets/custom.ts` | Кастомные поля и пресеты (см. ниже). |
| `svg/iD-sprite/icons/icon-bench.svg` | Иконка лавочки. |
| `svg/iD-sprite/icons/icon-gazebo.svg` | Иконка беседки. |
| `svg/iD-sprite/icons/icon-bus_stop.svg` | Иконка остановки. |
| `svg/iD-sprite/icons/icon-gps_track.svg` | Иконка кнопки GPS-трека. |
| `svg/iD-sprite/icons/icon-record.svg` | Иконка индикатора записи. |
| `test/spec/osm/osm_xml.js` | Тесты парсера и сериализатора. |

## Новые теги и пресеты

- Светофор (`highway=traffic_signals`) получил поля: `traffic_signals:cycle` (цикл, с), `traffic_signals:phases` (например `green:35;yellow:3;red:52`), `traffic_signals:offset` (сдвиг зелёной волны, с).
- Пресет «Tram Signal»: `railway=signal` + `railway:signal:main:form=light` + `railway:signal:main=tram_light`, те же поля фаз.
- Знаки: пресеты `traffic_sign=RU:<номер ПДД>` (2.1, 2.4, 2.5, 3.1, 3.2, 3.24, 4.1.1–4.1.3, 5.19.1) с полем направления; для 3.24 ещё `maxspeed`. Таблица в `RU_SIGNS`, расширяется одной строкой.

## 🆕 Новые объекты: лавочки, беседки, остановки, фото, GPS-трек

### 1. Лавочки / скамейки (`amenity=bench`)

Пресет лавочки уже существует в базе OSM. К нему добавлены новые поля:

| Поле | OSM-тег | Варианты |
|------|---------|----------|
| Материал лавочки | `material` | дерево, металл, бетон, камень, пластик, композит, рециклированный пластик |
| Ссылка на фото объекта | `image` | URL ссылка на фото |
| Сайт объекта | `website` | URL веб-сайта |

**Поиск:** `лавочка`, `скамейка`, `bench`  
**Иконка:** `svg/iD-sprite/icons/icon-bench.svg`

### 2. Беседки (`leisure=gazebo`)

Новый пресет для беседок:

| Поле | OSM-тег | Варианты |
|------|---------|----------|
| Тип беседки | `gazebo:type` | деревянная, металлическая, каменная, кирпичная, другая |
| Ссылка на фото объекта | `image` | URL ссылка на фото |
| Сайт объекта | `website` | URL веб-сайта |

**Поиск:** `беседка`, `альтанка`, `gazebo`  
**Иконка:** `svg/iD-sprite/icons/icon-gazebo.svg`

### 3. Остановки (`highway=bus_stop`)

Пресет остановки уже существует в базе OSM. К нему добавлены поля для уточнения типа:

| Поле | OSM-тег | Варианты |
|------|---------|----------|
| Тип таблички остановки | `bus_stop:sign` | грибок (mushroom), столб (pole), без таблички (none) |
| Отопление | `heating` | да (yes) / нет (no) |
| Бак для мусора | `waste_basket` | да (yes) / нет (no) |
| Ссылка на фото объекта | `image` | URL ссылка на фото |
| Сайт объекта | `website` | URL веб-сайта |

**Поиск:** `остановка`, `автобус`, `bus_stop`  
**Иконка:** `svg/iD-sprite/icons/icon-bus_stop.svg`

### 4. Фото и ссылки на объекты

Поля `image` и `website` добавлены к лавочкам, беседкам и остановкам. Позволяют прикреплять ссылки на реальные фотографии и веб-сайты объектов.

### 5. Запись GPS-трека

Новый режим записи траектории движения:

- **Кнопка** на верхней панели инструментов
- **Горячая клавиша:** `G`
- Запись через браузерное API геолокации (`navigator.geolocation.watchPosition`)
- Точки создаются как узлы OSM, соединяются в линию (way)
- Минимальное расстояние между точками: 5 метров
- По завершении линия получает теги: `type=gps_track`, дата создания, количество точек
- Индикатор записи на кнопке и всплывающие уведомления

**Иконки:** `svg/iD-sprite/icons/icon-gps_track.svg`, `svg/iD-sprite/icons/icon-record.svg`

## Ограничения (честно)

- Теги `traffic_signals:cycle/phases/offset` не входят в стандарт OSM. Серверные адаптеры (netconvert и др.) их, скорее всего, игнорируют и строят программу светофора сами. Для жюри это «ценность редактора», но на видео SUMO может не измениться. Проверить прогоном `example.osm`.
- Схему тегов трамвайного сигнала нужно сверить с wiki OSM (Key:railway:signal).
- Docker-образ я не собирал (в моей среде нет docker). Если не соберётся, пришлите лог. Адрес `PUBLIC_URL` зашивается при сборке: для другого хоста `docker build --build-arg PUBLIC_URL=http://host:port .`. Подсказки названий (NSI) и Wikipedia/Wikidata-поля без интернета не работают.
- Данные считаются загруженными целиком; при сильном отдалении карта скрывает редактируемые объекты (минимальный зум 16).
- GPS-трек требует доступа к геолокации браузера.

## Как запустить

### Требования
- Node.js >= 22
- Интернет-соединение (для снимков карт)

### Установка и запуск (Командная строка cmd.exe, не PowerShell)

```cmd
cd c:\Users\yushi\Downloads\uds-editor
npm install --legacy-peer-deps
npm run build
npm run dist
npm start
```

Откройте браузер: **http://localhost:8080**

### Выбор снимков карт
1. Нажмите кнопку слоёв (иконка карты) в правой панели
2. Выберите источник снимков (Bing, Maxar, Esri и др.)
3. Или добавьте свой источник через URL тайлов

## 📝 Примеры тегов OSM

### Лавочка
```text
amenity=bench
material=wood
image=https://example.com/photo.jpg
website=https://example.com
```

### Беседка
```text
leisure=gazebo
gazebo:type=wooden
image=https://example.com/photo.jpg
```

### Остановка с грибком, отоплением и баком
```text
highway=bus_stop
bus_stop:sign=mushroom
heating=yes
waste_basket=yes
image=https://example.com/photo.jpg
```

### GPS-трек
```text
type=gps_track
created=2026-11-10T15:00:00Z
points=145
```

## 🛠️ Техническая реализация

- Пресеты расширяются через `modules/presets/custom.ts` функцией `presetsWithCustom()`
- Существующие пресеты OSM (`amenity/bench`, `highway/bus_stop`) не дублируются, а расширяются новыми полями через `EXTRA_FIELDS`
- Новый пресет беседки (`leisure=gazebo`) добавляется как кастомный
- GPS-трек реализован через `navigator.geolocation.watchPosition()`
- Точки трека сохраняются как OSM узлы, соединённые в линию (way)
- Кнопка GPS-трека использует клавиатурную комбинацию `G`

## 📄 Лицензия

Проект основан на [openstreetmap/iD](https://github.com/openstreetmap/iD) и распространяется под лицензией ISC.
