## @e22m4u/js-repository-json-schema

Модуль генерации
[*JSON Schema Draft 2020-12*](https://json-schema.org/draft/2020-12/json-schema-core) для
[@e22m4u/js-repository](http://www.npmjs.com/package/@e22m4u/js-repository)

## Содержание

- [Установка](#установка)
- [Использование](#использование)
  - [Наследование моделей](#наследование-моделей)
  - [Связи (relations)](#связи-relations)
  - [Параметры схемы](#параметры-схемы)
  - [Ключи-расширения (x-js-*)](#ключи-расширения-x-js-)
- [Тесты](#тесты)
- [Лицензия](#лицензия)

## Установка

```bash
npm install @e22m4u/js-repository-json-schema
```

Модуль поддерживает ESM и CommonJS стандарты.

*ESM*

```js
import {JsonSchemaGenerator} from '@e22m4u/js-repository-json-schema';
```

*CommonJS*

```js
const {JsonSchemaGenerator} = require('@e22m4u/js-repository-json-schema');
```

## Использование

Определение простой модели и генерация *JSON-схемы*.

```js
import {DataType, DatabaseSchema} from '@e22m4u/js-repository';
import {JsonSchemaGenerator} from '@e22m4u/js-repository-json-schema';

// создание схемы баз данных, определение источника данных и модели
const dbs = new DatabaseSchema();

dbs.defineModel({
  name: 'user',
  properties: {
    firstName: {
      type: DataType.STRING,
      required: true,      // поле будет добавлено в массив "required"
    },
    age: {
      type: DataType.NUMBER,
      default: 18,         // будет добавлено поле "default"
    },
    isActive: {
      type: DataType.BOOLEAN,
      'x-js-examples': [true, false], // специфичное для Json Schema поле
    },
  },
});

// получение генератора из сервис-контейнера
const generator = dbs.getService(JsonSchemaGenerator);

// генерация JSON-схемы по названию модели
// (на данном этапе модель должна быть определена)
const schema = generator.genSchema('user');

console.log(schema);
// {
//   "type": "object",
//   "properties": {
//     "firstName": {
//       "type": "string",
//     },
//     "age": {
//       "type": "number",
//       "default": 18
//     },
//     "isActive": {
//       "type": "boolean",
//       "examples": [true, false]
//     }
//   },
//   "required": [
//     "firstName"
//   ]
// }
```

*i. Если для модели определен источник данных, то генератор автоматически
добавит первичный ключ (*id*), если он не был описан вручную.*

### Наследование моделей

При использовании свойства `base` для наследования одной модели от другой,
генератор создает «плоскую» структуру схемы. Связи и обязательные поля
базовой модели копируются непосредственно в схему дочерней модели.

```js
// базовая модель
dbs.defineModel({
  name: 'baseEntity',
  properties: {
    createdAt: {
      type: DataType.STRING,
      required: true,
    },
    status: {
      type: DataType.STRING,
      default: 'active'
    }
  }
});

// дочерняя модель
dbs.defineModel({
  name: 'user',
  base: 'baseEntity',
  properties: {
    name: DataType.STRING,
    // переопределение родительского свойства
    status: {
      type: DataType.NUMBER,
      default: 1
    }
  }
});

const schema = generator.genSchema('user');
console.log(schema);
// {
//   "type": "object",
//   "properties": {
//     "createdAt": {
//       "type": "string"
//     },
//     "name": {
//       "type": "string"
//     },
//     "status": {
//       "type": "number",
//       "default": 1
//     }
//   },
//   "required": [
//     "createdAt"
//   ]
// }
```

### Связи (relations)

Блок `relations` в определении модели используется генератором для внедрения
внешних ключей в итоговую схему. Сами объекты связанных данных в схему
не добавляются, генерируются только поля для хранения идентификаторов.
Обработка связей зависит от их типа.

- **Belongs To**  
  В схему добавляется свойство внешнего ключа (например, `categoryId`). Если
  связь полиморфная, дополнительно внедряется строковое свойство
  дискриминатора (например, `categoryType`).

- **References Many**  
  В схему добавляется свойство с типом массив (например, `cityIds`), содержащее
  список внешних ключей.

- **Has One / Has Many**  
  Игнорируются при генерации схемы текущей модели, так как внешние ключи
  для этих типов связей хранятся на стороне целевых моделей.

Тип свойства внешнего ключа вычисляется автоматически на основе первичного
ключа целевой модели. Если тип первичного ключа целевой модели не определен
или связь полиморфная, то применяется тип по умолчанию (см. параметр
[defaultPrimaryKeyType](#параметры-схемы)). Если свойство для ключа
явно описано в блоке `properties`, то оно не будет перезаписано.

```js
dbs.defineModel({
  name: 'category',
  properties: {
    id: {
      type: DataType.STRING,
      primaryKey: true,
    },
  },
});

dbs.defineModel({
  name: 'article',
  relations: {
    // внедрит строковое свойство "categoryId", 
    // так как id в модели category имеет тип "string"
    category: {
      type: RelationType.BELONGS_TO,
      model: 'category'
    },
    // внедрит "ownerId" (число по умолчанию)
    // и "ownerType" (строка)
    owner: {
      type: RelationType.BELONGS_TO,
      polymorphic: true
    },
  },
});

const schema = generator.genSchema('article');
console.log(schema);
// {
//   "type": "object",
//   "properties": {
//     "categoryId": {
//       "type": "string"
//     },
//     "ownerId": {
//       "type": "number"
//     },
//     "ownerType": {
//       "type": "string"
//     }
//   }
// }
```

### Параметры схемы

Метод `genSchema` принимает второй необязательный аргумент с настройками.

```js
const schema = generator.genSchema('user', {
  // исключить определенные свойства
  // (например, пароли или внутренние ключи)
  excludeProperties: ['password', 'internalToken'],
  
  // пользовательская фабрика для генерации $ref ссылок
  // по умолчанию: modelName => ({$ref: modelName})
  refFactory: (modelName) => ({$ref: `#/components/schemas/${modelName}`}),
  
  // тип первичных и внешних ключей по умолчанию
  // "number" или "string" (по умолчанию "number")
  defaultPrimaryKeyType: 'string',
});
```

### Ключи-расширения (x-js-*)

Для добавления специфичных ключевых слов *JSON Schema* в определении модели
используестся префикс `x-js-*`. При генерации схемы этот префикс будет
автоматически удален, а сами ключи добавлены в итоговый объект.

```js
dbs.defineModel({
  name: 'user',
  // расширения на уровне модели
  'x-js-title': 'User Model',
  'x-js-description': 'Схема данных пользователя',
  properties: {
    email: {
      type: DataType.STRING,
      required: true,
      // расширения на уровне свойства
      'x-js-format': 'email',
      'x-js-maxLength': 255,
    },
  },
});

const schema = generator.genSchema('user');
console.log(schema);
// {
//   "type": "object",
//   "title": "User Model",
//   "description": "Схема данных пользователя",
//   "properties": {
//     "id": {
//       "type": "number"
//     },
//     "email": {
//       "type": "string",
//       "format": "email",
//       "maxLength": 255
//     }
//   },
//   "required": [
//     "email"
//   ]
// }
```

Ключи-расширения применяются к схеме в самом конце генерации. Это означает,
что с помощью `x-js-*` можно не только добавлять новые ключевые слова,
но и принудительно переопределять сгенерированные (например, при использовании
`x-js-type` будет переопределен тип свойства).

## Тесты

```bash
npm run test
```

## Лицензия

MIT
