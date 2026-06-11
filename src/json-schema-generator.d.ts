import {Service} from '@e22m4u/js-service';

/**
 * Структура, которую возвращает генератор.
 */
interface JsonSchema {
  type?: 'string' | 'number' | 'boolean' | 'array' | 'object';
  properties?: Record<string, JsonSchema>;
  required?: string[];
  items?: JsonSchema;
  example?: unknown;
  default?: unknown;
  $ref?: string;
  allOf?: JsonSchema[];
}

/**
 * Опции, которые принимает метод.
 */
interface JsonSchemaGeneratorOptions {
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
  genSchema(
    modelName: string,
    options?: JsonSchemaGeneratorOptions,
  ): JsonSchema;
}
