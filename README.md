## @e22m4u/js-repository-json-schema

Модуль генерации
[*JSON Schema Draft 2020-12*](https://json-schema.org/draft/2020-12/json-schema-core) для
[@e22m4u/js-repository](http://www.npmjs.com/package/@e22m4u/js-repository)

## Содержание

- [Установка](#установка)
- [Использование](#использование)
- [Параметры](#параметры)
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

// создание схемы БД, определение источника данных и модели
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

## Параметры

Метод `genSchema` принимает второй необязательный аргумент с настройками схемы.

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

## Тесты

```bash
npm run test
```

## Лицензия

MIT
