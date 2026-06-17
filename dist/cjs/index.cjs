"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.js
var index_exports = {};
__export(index_exports, {
  JsonSchemaGenerator: () => JsonSchemaGenerator
});
module.exports = __toCommonJS(index_exports);

// src/json-schema-generator.js
var import_js_service = require("@e22m4u/js-service");
var import_js_repository = require("@e22m4u/js-repository");
var JsonSchemaGenerator = class extends import_js_service.Service {
  static {
    __name(this, "JsonSchemaGenerator");
  }
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
    if (!modelName || typeof modelName !== "string") {
      throw new import_js_repository.InvalidArgumentError(
        'Parameter "modelName" must be a non-empty String, but %v was given.',
        modelName
      );
    }
    if (options === null || typeof options !== "object" || Array.isArray(options)) {
      throw new import_js_repository.InvalidArgumentError(
        'Parameter "options" must be an Object, but %v was given.',
        options
      );
    }
    this._validateOptions(options);
    const opts = this._normalizeOptions(options);
    const registry = this.getService(import_js_repository.DefinitionRegistry);
    const modelDef = registry.getModel(modelName);
    const schema = {
      type: "object",
      properties: {}
    };
    const requiredFields = [];
    const utils = this.getService(import_js_repository.ModelDefinitionUtils);
    const propsDef = utils.getPropertiesDefinitionInBaseModelHierarchy(modelName);
    this._injectImplicitPrimaryKeyIfNeeded(modelDef, propsDef, schema, opts);
    for (const [propName, propDef] of Object.entries(propsDef)) {
      if (opts.excludeProperties.includes(propName)) {
        continue;
      }
      schema.properties[propName] = this._mapPropertyToSchema(propDef, opts);
      if (propDef && typeof propDef === "object" && propDef.required) {
        requiredFields.push(propName);
      }
    }
    const relsDef = utils.getRelationsDefinitionInBaseModelHierarchy(modelName);
    this._injectImplicitForeignKeys(relsDef, propsDef, schema, opts);
    if (requiredFields.length > 0) {
      schema.required = requiredFields;
    }
    const modelExtensions = this._resolveExtensionKeywords(modelDef);
    Object.assign(schema, modelExtensions);
    return schema;
  }
  /**
   * Проверка опций генератора.
   *
   * @param {object} options
   * @private
   */
  _validateOptions(options) {
    if (options.excludeProperties !== void 0) {
      if (!Array.isArray(options.excludeProperties)) {
        throw new import_js_repository.InvalidArgumentError(
          'Option "excludeProperties" must be an Array, but %v was given.',
          options.excludeProperties
        );
      }
      options.excludeProperties.forEach((propertyName, index) => {
        if (!propertyName || typeof propertyName !== "string") {
          throw new import_js_repository.InvalidArgumentError(
            'Element %d of the option "excludeProperties" must be a non-empty String, but %v was given.',
            index,
            propertyName
          );
        }
      });
    }
    if (options.refFactory !== void 0 && typeof options.refFactory !== "function") {
      throw new import_js_repository.InvalidArgumentError(
        'Option "refFactory" must be a Function, but %v was given.',
        options.refFactory
      );
    }
    if (options.defaultPrimaryKeyType !== void 0 && !["string", "number"].includes(options.defaultPrimaryKeyType)) {
      throw new import_js_repository.InvalidArgumentError(
        'Option "defaultPrimaryKeyType" allows "number" or "string" value, but %v was given.',
        options.defaultPrimaryKeyType
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
      refFactory: options.refFactory || ((modelName) => ({ $ref: modelName })),
      defaultPrimaryKeyType: options.defaultPrimaryKeyType || "number"
    };
  }
  /**
   * Преобразование определения свойства
   * репозитория в JSON Schema объект.
   *
   * @param   {string|object} propDef Определение свойства
   * @param   {object}        options Настройки генератора
   * @returns {object}
   * @private
   */
  _mapPropertyToSchema(propDef, options) {
    if (typeof propDef === "string") {
      return this._createSchemaByType(propDef);
    }
    if (!propDef || typeof propDef !== "object") {
      return {};
    }
    if (propDef.type === import_js_repository.DataType.OBJECT && propDef.model) {
      return options.refFactory(propDef.model);
    }
    if (propDef.type === import_js_repository.DataType.ARRAY && propDef.itemModel) {
      return {
        type: "array",
        items: options.refFactory(propDef.itemModel)
      };
    }
    const schema = this._createSchemaByType(propDef.type);
    if (propDef.type === import_js_repository.DataType.ARRAY && propDef.itemType) {
      schema.items = this._createSchemaByType(propDef.itemType);
    }
    if (propDef.default !== void 0) {
      schema.default = typeof propDef.default === "function" ? propDef.default() : propDef.default;
    }
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
      case import_js_repository.DataType.STRING:
        return { type: "string" };
      case import_js_repository.DataType.NUMBER:
        return { type: "number" };
      case import_js_repository.DataType.BOOLEAN:
        return { type: "boolean" };
      case import_js_repository.DataType.ARRAY:
        return { type: "array" };
      case import_js_repository.DataType.OBJECT:
        return { type: "object" };
      case import_js_repository.DataType.ANY:
        return {};
      // any type
      default:
        return { type: dataType };
    }
  }
  /**
   * Добавление неявного первичного ключа, если он не был задан
   * в свойствах текущей модели и ее родителей.
   *
   * @param {object} modelDef
   * @param {object} propsDef
   * @param {object} schema
   * @param {object} options
   * @private
   */
  _injectImplicitPrimaryKeyIfNeeded(modelDef, propsDef, schema, options) {
    if (!modelDef.datasource) {
      return;
    }
    const hasExplicitPk = Object.values(propsDef).some(
      (prop) => prop && typeof prop === "object" && prop.primaryKey
    );
    if (!hasExplicitPk && !propsDef[import_js_repository.DEFAULT_PRIMARY_KEY_PROPERTY_NAME]) {
      if (!options.excludeProperties.includes(import_js_repository.DEFAULT_PRIMARY_KEY_PROPERTY_NAME)) {
        schema.properties[import_js_repository.DEFAULT_PRIMARY_KEY_PROPERTY_NAME] = this._createSchemaByType(options);
      }
    }
  }
  /**
   * Инъекция свойств для хранения внешних ключей и дискриминаторов,
   * которые возникают из-за связей (relations), но не описаны явно
   * в properties.
   *
   * @param {object} relsDef
   * @param {object} propsDef
   * @param {object} schema
   * @param {object} options
   * @private
   */
  _injectImplicitForeignKeys(relsDef, propsDef, schema, options) {
    for (const [relName, relDef] of Object.entries(relsDef)) {
      if (relDef.type === import_js_repository.RelationType.BELONGS_TO) {
        const foreignKey = relDef.foreignKey || `${relName}Id`;
        if (!propsDef[foreignKey] && !options.excludeProperties.includes(foreignKey)) {
          const foreignKeyDataType = this._resolveForeignKeyDataType(
            relDef,
            options
          );
          schema.properties[foreignKey] = this._createSchemaByType(foreignKeyDataType);
        }
        if (relDef.polymorphic) {
          const discriminator = relDef.discriminator || `${relName}Type`;
          if (!propsDef[discriminator] && !options.excludeProperties.includes(discriminator)) {
            schema.properties[discriminator] = this._createSchemaByType(
              import_js_repository.DataType.STRING
            );
          }
        }
      } else if (relDef.type === import_js_repository.RelationType.REFERENCES_MANY) {
        const singularRelName = (0, import_js_repository.singularize)(relName);
        const foreignKey = relDef.foreignKey || `${singularRelName}Ids`;
        if (!propsDef[foreignKey] && !options.excludeProperties.includes(foreignKey)) {
          const foreignKeyDataType = this._resolveForeignKeyDataType(
            relDef,
            options
          );
          schema.properties[foreignKey] = {
            type: "array",
            items: this._createSchemaByType(foreignKeyDataType)
          };
        }
      }
    }
  }
  /**
   * Пытается определить тип первичного ключа целевой модели.
   * Если связь полиморфная или тип ключа ANY, то возвращает
   * тип по умолчанию (options.defaultPrimaryKeyType).
   *
   * @param   {object} relDef  Определение связи
   * @param   {object} options Настройки генератора
   * @returns {string} Тип данных (DataType)
   * @private
   */
  _resolveForeignKeyDataType(relDef, options) {
    if (!relDef.model) {
      return options.defaultPrimaryKeyType;
    }
    const registry = this.getService(import_js_repository.DefinitionRegistry);
    if (!registry.hasModel(relDef.model)) {
      throw new import_js_repository.InvalidArgumentError(
        "Model %v must be registered before generating a JSON Schema.",
        relDef.model
      );
    }
    const utils = this.getService(import_js_repository.ModelDefinitionUtils);
    try {
      const pkName = utils.getPrimaryKeyAsPropertyName(relDef.model);
      const pkType = utils.getDataTypeByPropertyName(relDef.model, pkName);
      if (pkType && pkType !== import_js_repository.DataType.ANY) {
        return pkType;
      }
    } catch {
    }
    return options.defaultPrimaryKeyType;
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
    const prefix = "x-js-";
    Object.keys(def).forEach((propName) => {
      if (propName.startsWith(prefix)) {
        const keyword = propName.slice(prefix.length);
        if (keyword) {
          extensions[keyword] = def[propName];
        }
      }
    });
    return extensions;
  }
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  JsonSchemaGenerator
});
