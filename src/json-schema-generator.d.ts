import {Service, ServiceContainer} from '@e22m4u/js-service';
import {JsonSchemaObject} from './json-schema.js';

/**
 * Gen schema options.
 */
interface GenSchemaOptions {
  excludeProperties?: string[];
  refFactory?: (modelName: string) => {$ref: string};
  defaultPrimaryKeyType?: 'number' | 'string';
}

/**
 * Json schema generator.
 */
export class JsonSchemaGenerator extends Service {
  /**
   * Конструктор.
   *
   * @param container Сервис-контейнер
   * @param options   Глобальные опции генерации
   */
  constructor(container?: ServiceContainer, options?: GenSchemaOptions);

  /**
   * Сгенерировать JSON Schema для указанной модели.
   *
   * Опции, переданные вторым аргументом, имеют приоритет над
   * глобальными опциями, заданными через конструктор.
   *
   * @param modelName Название модели
   * @param options   Опции генерации
   */
  genSchema(modelName: string, options?: GenSchemaOptions): JsonSchemaObject;
}