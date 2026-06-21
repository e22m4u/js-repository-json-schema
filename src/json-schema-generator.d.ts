import {Service} from '@e22m4u/js-service';
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
   * Сгенерировать JSON Schema для указанной модели.
   *
   * @param modelName Название модели
   * @param options   Опции генерации
   */
  genSchema(modelName: string, options?: GenSchemaOptions): JsonSchemaObject;
}
