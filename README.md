## @e22m4u/js-repository-json-schema

Модуль генерации
[*JSON Schema Draft 2020-12*](https://json-schema.org/draft/2020-12/json-schema-core) для
[@e22m4u/js-repository](http://www.npmjs.com/package/@e22m4u/js-repository)

## Содержание

- [Установка](#установка)
- [Использование](#использование)
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

Определение простой модели и генерация для нее JSON-схемы.

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
    isActive: DataType.BOOLEAN,
  },
});

// получение генератора из сервис-контейнера
const generator = dbs.getService(JsonSchemaGenerator);

// генерация JSON-схемы по названию модели
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
//     }
//   },
//   "required": [
//     "firstName"
//   ]
// }
```

*i. Если для модели определен источник данных, то генератор автоматически
добавит первичный ключ (*id*), если он не был описан вручную.*

### Параметры схемы

Метод `genSchema` принимает второй необязательный аргумент с настройками.

```js
const schema = generator.genSchema('user', {
  // исключить определенные свойства
  // (например, пароли или внутренние ключи)
  excludeProperties: ['password', 'internalToken'],
  
  // пользовательская фабрика для генерации $ref ссылок
  // по умолчанию modelName => ({ $ref: `#/components/schemas/${modelName}` })
  refFactory: (modelName) => ({$ref: `#/components/schemas/${modelName}Input`}),
  
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
`x-js-type` будет переопределен тип, указанный в модели).

## Тесты

```bash
npm run test
```

## Лицензия

MIT
