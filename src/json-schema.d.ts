/**
 * JSON Type.
 * https://json-schema.org/draft/2020-12/json-schema-core#section-4.2.1
 */
export declare const JsonType: {
  STRING: 'string';
  NUMBER: 'number';
  INTEGER: 'integer';
  BOOLEAN: 'boolean';
  OBJECT: 'object';
  ARRAY: 'array';
  NULL: 'null';
};

export type JsonType = (typeof JsonType)[keyof typeof JsonType];

/**
 * JSON Schema Document.
 * A JSON Schema MUST be an object or a boolean.
 * https://json-schema.org/draft/2020-12/json-schema-core#section-4.3
 */
export type JsonSchema = JsonSchemaObject | boolean;

/**
 * JSON Schema Object.
 * Represents the structured definition of JSON Schema Draft 2020-12.
 */
export type JsonSchemaObject = {
  // -------------------------------------------------------------------
  // Core Vocabulary
  // https://json-schema.org/draft/2020-12/json-schema-core#section-8
  // -------------------------------------------------------------------
  $schema?: string;
  $id?: string;
  $ref?: string;
  $anchor?: string;
  $dynamicRef?: string;
  $dynamicAnchor?: string;
  $vocabulary?: {[uri: string]: boolean};
  $comment?: string;
  $defs?: {[key: string]: JsonSchema};

  // -------------------------------------------------------------------
  // Applicator Vocabulary (Applying Subschemas)
  // https://json-schema.org/draft/2020-12/json-schema-core#section-10
  // -------------------------------------------------------------------

  // Logic
  allOf?: JsonSchema[];
  anyOf?: JsonSchema[];
  oneOf?: JsonSchema[];
  not?: JsonSchema;

  // Conditional
  if?: JsonSchema;
  then?: JsonSchema;
  else?: JsonSchema;
  dependentSchemas?: {[key: string]: JsonSchema};

  // Arrays
  prefixItems?: JsonSchema[];
  /**
   * В Draft 2020-12 `items` больше не принимает массив схем.
   * Массив схем теперь обрабатывается через `prefixItems`.
   */
  items?: JsonSchema;
  contains?: JsonSchema;

  // Objects
  properties?: {[name: string]: JsonSchema};
  patternProperties?: {[pattern: string]: JsonSchema};
  additionalProperties?: JsonSchema;
  propertyNames?: JsonSchema;

  // -------------------------------------------------------------------
  // Unevaluated Locations Vocabulary
  // https://json-schema.org/draft/2020-12/json-schema-core#section-11
  // -------------------------------------------------------------------
  unevaluatedItems?: JsonSchema;
  unevaluatedProperties?: JsonSchema;

  // -------------------------------------------------------------------
  // Validation Vocabulary
  // (Defined in the companion validation specification)
  // -------------------------------------------------------------------

  // Any Type
  type?: JsonType | JsonType[];
  enum?: unknown[];
  const?: unknown;

  // Numbers
  multipleOf?: number;
  maximum?: number;
  exclusiveMaximum?: number;
  minimum?: number;
  exclusiveMinimum?: number;

  // Strings
  maxLength?: number;
  minLength?: number;
  pattern?: string;

  // Arrays
  maxItems?: number;
  minItems?: number;
  uniqueItems?: boolean;
  maxContains?: number;
  minContains?: number;

  // Objects
  maxProperties?: number;
  minProperties?: number;
  required?: string[];
  dependentRequired?: {[key: string]: string[]};

  // -------------------------------------------------------------------
  // Format Vocabulary
  // -------------------------------------------------------------------
  format?: string;

  // -------------------------------------------------------------------
  // Meta-Data and Annotations Vocabulary
  // -------------------------------------------------------------------
  title?: string;
  description?: string;
  default?: unknown;
  deprecated?: boolean;
  readOnly?: boolean;
  writeOnly?: boolean;
  examples?: unknown[];

  // -------------------------------------------------------------------
  // Content Vocabulary (String-encoded data)
  // -------------------------------------------------------------------
  contentMediaType?: string;
  contentEncoding?: string;
  contentSchema?: JsonSchema;

  // -------------------------------------------------------------------
  // Extensibility
  // "A JSON Schema MAY contain properties which are not schema keywords."
  // -------------------------------------------------------------------
  [keyword: string]: unknown;
};
