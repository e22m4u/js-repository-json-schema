import {Service} from '@e22m4u/js-service';
import {InvalidArgumentError} from '@e22m4u/js-format';

import {
  DataType,
  singularize,
  RelationType,
  DefinitionRegistry,
  ModelDefinitionUtils,
  DEFAULT_PRIMARY_KEY_PROPERTY_NAME,
} from '@e22m4u/js-repository';

/**
 * Сервис генерации JSON Schema (OpenAPI/Swagger совместимой)
 * на основе определений моделей репозитория.
 */
export class JsonSchemaGenerator extends Service {
  /**
   * Сгенерировать JSON Schema для указанной модели.
   *
   * @param   {string}   modelName                       Название модели
   * @param   {object}   [options]                       Опции генерации
   * @param   {string[]} [options.excludeProperties]     Массив свойств для исключения из схемы
   * @param   {Function} [options.refFactory]            Функция для создания $ref строк
   * @param   {string}   [options.defaultPrimaryKeyType] Тип по умолчанию для Primary Key и Foreign Key ('number' или 'string')
   * @returns {object}   JSON Schema
   */
  genSchema(modelName, options = {}) {
    // modelName
    if (!modelName || typeof modelName !== 'string') {
      throw new InvalidArgumentError(
        'Parameter "modelName" must be a non-empty String, but %v was given.',
        modelName,
      );
    }
    // options
    if (
      options === null ||
      typeof options !== 'object' ||
      Array.isArray(options)
    ) {
      throw new InvalidArgumentError(
        'Parameter "options" must be an Object, but %v was given.',
        options,
      );
    }
    // проверка опций и инициализация
    // значений по умолчанию
    this._validateOptions(options);
    const opts = this._normalizeOptions(options);
    // получение определения модели из реестра
    const registry = this.getService(DefinitionRegistry);
    const modelDef = registry.getModel(modelName);
    // базовый каркас схемы
    const schema = {
      type: 'object',
      properties: {},
    };
    const requiredFields = [];
    const propertiesDef = modelDef.properties || {};
    // обработка неявного первичного ключа (primary key)
    this._injectImplicitPrimaryKeyIfNeeded(
      modelDef,
      propertiesDef,
      schema,
      opts,
    );
    // обработка явно заданных свойств модели
    for (const [propName, propDef] of Object.entries(propertiesDef)) {
      if (opts.excludeProperties.includes(propName)) {
        continue;
      }
      schema.properties[propName] = this._mapPropertyToSchema(propDef, opts);
      // если свойство явно помечено как обязательное (и не имеет default)
      if (propDef && typeof propDef === 'object' && propDef.required) {
        requiredFields.push(propName);
      }
    }
    // обработка неявных внешних ключей от связей
    // (foreign keys & discriminators)
    this._injectImplicitForeignKeys(modelDef, propertiesDef, schema, opts);
    // добавление массива required, если есть обязательные поля
    if (requiredFields.length > 0) {
      schema.required = requiredFields;
    }
    // применение ключей-расширений уровня модели
    const modelExtensions = this._resolveExtensionKeywords(modelDef);
    Object.assign(schema, modelExtensions);
    // обработка наследования (иерархия моделей)
    // если у модели есть базовая модель, то используется ключевое
    // слово allOf с ссылкой ($ref) на родительскую схему
    if (modelDef.base) {
      return {
        allOf: [opts.refFactory(modelDef.base), schema],
      };
    }
    return schema;
  }

  /**
   * Проверка опций генератора.
   *
   * @param {object} options
   * @private
   */
  _validateOptions(options) {
    // excludeProperties
    if (options.excludeProperties !== undefined) {
      if (!Array.isArray(options.excludeProperties)) {
        throw new InvalidArgumentError(
          'Option "excludeProperties" must be an Array, but %v was given.',
          options.excludeProperties,
        );
      }
      // excludeProperties[n]
      options.excludeProperties.forEach((propertyName, index) => {
        if (!propertyName || typeof propertyName !== 'string') {
          throw new InvalidArgumentError(
            'Element %d of the option "excludeProperties" ' +
              'must be a non-empty String, but %v was given.',
            index,
            propertyName,
          );
        }
      });
    }
    // refFactory
    if (
      options.refFactory !== undefined &&
      typeof options.refFactory !== 'function'
    ) {
      throw new InvalidArgumentError(
        'Option "refFactory" must be a Function, but %v was given.',
        options.refFactory,
      );
    }
    // defaultPrimaryKeyType
    if (
      options.defaultPrimaryKeyType !== undefined &&
      !['string', 'number'].includes(options.defaultPrimaryKeyType)
    ) {
      throw new InvalidArgumentError(
        'Option "defaultPrimaryKeyType" allows "number" ' +
          'or "string" value, but %v was given.',
        options.defaultPrimaryKeyType,
      );
    }
  }

  /**
   * Нормализация опций генератора.
   *
   * @param   {object} options
   * @returns {object}
   * @private
   */
  _normalizeOptions(options) {
    return {
      excludeProperties: options.excludeProperties || [],
      refFactory:
        options.refFactory ||
        (modelName => ({$ref: `#/components/schemas/${modelName}`})),
      defaultPrimaryKeyType: options.defaultPrimaryKeyType || 'number',
    };
  }

  /**
   * Преобразование определения свойства
   * репозитория в JSON Schema объект.
   *
   * @param   {string|object} propDef Определение свойства
   * @param   {object}        opts    Настройки генератора
   * @returns {object}
   * @private
   */
  _mapPropertyToSchema(propDef, opts) {
    // если передана краткая форма (просто строка DataType)
    if (typeof propDef === 'string') {
      return this._createSchemaByType(propDef);
    }
    if (!propDef || typeof propDef !== 'object') {
      return {};
    }
    // если это вложенный объект, ссылающийся на другую модель
    if (propDef.type === DataType.OBJECT && propDef.model) {
      return opts.refFactory(propDef.model);
    }
    // если это массив элементов, ссылающихся на другую модель
    if (propDef.type === DataType.ARRAY && propDef.itemModel) {
      return {
        type: 'array',
        items: opts.refFactory(propDef.itemModel),
      };
    }
    // получение базовой схемы с учетом типа
    const schema = this._createSchemaByType(propDef.type);
    // если это массив примитивов (itemType)
    if (propDef.type === DataType.ARRAY && propDef.itemType) {
      schema.items = this._createSchemaByType(propDef.itemType);
    }
    // установка реального default
    if (propDef.default !== undefined) {
      schema.default =
        typeof propDef.default === 'function'
          ? propDef.default()
          : propDef.default;
    }
    // применение ключей-расширений для свойства
    const propExtensions = this._resolveExtensionKeywords(propDef);
    Object.assign(schema, propExtensions);
    return schema;
  }

  /**
   * Создание примитивной схемы в зависимости от типа данных.
   *
   * @param   {string} dataType Тип данных
   * @returns {object}
   * @private
   */
  _createSchemaByType(dataType) {
    switch (dataType) {
      case DataType.STRING:
        return {type: 'string'};
      case DataType.NUMBER:
        return {type: 'number'};
      case DataType.BOOLEAN:
        return {type: 'boolean'};
      case DataType.ARRAY:
        return {type: 'array'};
      case DataType.OBJECT:
        return {type: 'object'};
      case DataType.ANY:
        return {}; // any type
      default:
        // фолбэк для нераспознанных типов
        // (например, если передали 'string' напрямую)
        return {type: dataType};
    }
  }

  /**
   * Добавление неявного первичного ключа, если он не был задан
   * в свойствах текущей модели и если модель не наследуется
   * от другой.
   *
   * @param {object} modelDef
   * @param {object} propertiesDef
   * @param {object} schema
   * @param {object} opts
   * @private
   */
  _injectImplicitPrimaryKeyIfNeeded(modelDef, propertiesDef, schema, opts) {
    // если источник данных не указан,
    // неявный первичный ключ генерировать не нужно
    if (!modelDef.datasource) {
      return;
    }
    // если модель наследуется, то предполагается,
    // что первичный ключ определен у родителя
    if (modelDef.base) {
      return;
    }
    // поиск явно заданного первичного ключа в свойствах
    const hasExplicitPk = Object.values(propertiesDef).some(
      prop => prop && typeof prop === 'object' && prop.primaryKey,
    );
    // если явного первичного ключа нет и поле "id" (стандартное) не описано
    if (!hasExplicitPk && !propertiesDef[DEFAULT_PRIMARY_KEY_PROPERTY_NAME]) {
      if (!opts.excludeProperties.includes(DEFAULT_PRIMARY_KEY_PROPERTY_NAME)) {
        schema.properties[DEFAULT_PRIMARY_KEY_PROPERTY_NAME] =
          this._createSchemaByType(opts.defaultPrimaryKeyType);
      }
    }
  }

  /**
   * Инъекция свойств для хранения внешних ключей и дискриминаторов,
   * которые возникают из-за связей (relations), но не описаны явно
   * в properties.
   *
   * @param {object} modelDef
   * @param {object} propertiesDef
   * @param {object} schema
   * @param {object} opts
   * @private
   */
  _injectImplicitForeignKeys(modelDef, propertiesDef, schema, opts) {
    const relations = modelDef.relations || {};
    for (const [relName, relDef] of Object.entries(relations)) {
      // определение типа ключа для текущей связи
      const foreignKeyDataType = this._resolveForeignKeyDataType(relDef, opts);
      // обработка связи belongsTo
      // (хранит foreign key и, опционально, discriminator)
      if (relDef.type === RelationType.BELONGS_TO) {
        const foreignKey = relDef.foreignKey || `${relName}Id`;
        // внешний ключ
        if (
          !propertiesDef[foreignKey] &&
          !opts.excludeProperties.includes(foreignKey)
        ) {
          schema.properties[foreignKey] =
            this._createSchemaByType(foreignKeyDataType);
        }
        // дискриминатор (для полиморфных связей)
        if (relDef.polymorphic) {
          const discriminator = relDef.discriminator || `${relName}Type`;
          if (
            !propertiesDef[discriminator] &&
            !opts.excludeProperties.includes(discriminator)
          ) {
            schema.properties[discriminator] = this._createSchemaByType(
              DataType.STRING,
            );
          }
        }
      }
      // обработка связи referencesMany
      // (хранит массив foreign keys)
      else if (relDef.type === RelationType.REFERENCES_MANY) {
        const singularRelName = singularize(relName);
        const foreignKey = relDef.foreignKey || `${singularRelName}Ids`;
        if (
          !propertiesDef[foreignKey] &&
          !opts.excludeProperties.includes(foreignKey)
        ) {
          schema.properties[foreignKey] = {
            type: 'array',
            items: this._createSchemaByType(foreignKeyDataType),
          };
        }
      }
      // связи HAS_ONE и HAS_MANY не хранят внешний ключ
      // в текущей таблице/модели, поэтому игнорируются
    }
  }

  /**
   * Пытается определить тип первичного ключа целевой модели.
   * Если связь полиморфная или тип ключа ANY, то возвращает
   * тип по умолчанию (opts.defaultPrimaryKeyType).
   *
   * @param   {object} relDef Определение связи
   * @param   {object} opts   Настройки генератора
   * @returns {string} Тип данных (DataType)
   * @private
   */
  _resolveForeignKeyDataType(relDef, opts) {
    // если целевая модель не указана (например, полиморфная связь)
    if (!relDef.model) {
      return opts.defaultPrimaryKeyType;
    }
    const registry = this.getService(DefinitionRegistry);
    // если целевая модель еще не зарегистрирована
    if (!registry.hasModel(relDef.model)) {
      throw new InvalidArgumentError(
        'Model %v must be registered before generating a JSON Schema.',
        relDef.model,
      );
    }
    const utils = this.getService(ModelDefinitionUtils);
    try {
      // попытка получить имя первичного ключа и его тип
      const pkName = utils.getPrimaryKeyAsPropertyName(relDef.model);
      const pkType = utils.getDataTypeByPropertyName(relDef.model, pkName);
      // если тип определен и это не ANY,
      // то используется данный тип
      if (pkType && pkType !== DataType.ANY) {
        return pkType;
      }
    } catch {
      // ошибки игнорируются (например, циклическое наследование)
      // и просто провал к типу по умолчанию
    }
    // во всех остальных случаях используется значение по умолчанию
    return opts.defaultPrimaryKeyType;
  }

  /**
   * Извлечение ключей-расширений из определения
   * модели или свойства.
   *
   * @param   {object} def Опеределение модели или свойства.
   * @returns {object} Объект содержащий ключи-расширений без префикса.
   */
  _resolveExtensionKeywords(def) {
    const extensions = {};
    const prefix = 'x-js-';
    Object.keys(def).forEach(propName => {
      if (propName.startsWith(prefix)) {
        const keyword = propName.slice(prefix.length);
        if (keyword) {
          extensions[keyword] = def[propName];
        }
      }
    });
    return extensions;
  }
}
