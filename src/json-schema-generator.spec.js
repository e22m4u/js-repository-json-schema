import {expect} from 'chai';
import {format} from '@e22m4u/js-format';
import {JsonSchemaGenerator} from './json-schema-generator.js';

import {
  DataType,
  RelationType,
  DatabaseSchema,
  DEFAULT_PRIMARY_KEY_PROPERTY_NAME,
} from '@e22m4u/js-repository';

describe('JsonSchemaGenerator', function () {
  describe('genSchema', function () {
    it('should require the parameter "modelName" to be a non-empty String', function () {
      const throwable = v => () => {
        const dbs = new DatabaseSchema();
        dbs.defineModel({name: 'model'});
        const S = dbs.getService(JsonSchemaGenerator);
        S.genSchema(v);
      };
      const error = s =>
        format(
          'Parameter "modelName" must be a non-empty String, but %s was given.',
          s,
        );
      expect(throwable('')).to.throw(error('""'));
      expect(throwable(10)).to.throw(error('10'));
      expect(throwable(0)).to.throw(error('0'));
      expect(throwable(true)).to.throw(error('true'));
      expect(throwable(false)).to.throw(error('false'));
      expect(throwable([])).to.throw(error('Array'));
      expect(throwable({})).to.throw(error('Object'));
      expect(throwable(undefined)).to.throw(error('undefined'));
      expect(throwable(null)).to.throw(error('null'));
      throwable('model')();
    });

    it('should require the parameter "options" to be an Object', function () {
      const throwable = v => () => {
        const dbs = new DatabaseSchema();
        dbs.defineModel({name: 'model'});
        const S = dbs.getService(JsonSchemaGenerator);
        S.genSchema('model', v);
      };
      const error = s =>
        format('Parameter "options" must be an Object, but %s was given.', s);
      expect(throwable('str')).to.throw(error('"str"'));
      expect(throwable('')).to.throw(error('""'));
      expect(throwable(10)).to.throw(error('10'));
      expect(throwable(0)).to.throw(error('0'));
      expect(throwable(true)).to.throw(error('true'));
      expect(throwable(false)).to.throw(error('false'));
      expect(throwable([])).to.throw(error('Array'));
      expect(throwable(null)).to.throw(error('null'));
      throwable({})();
      throwable(undefined)();
    });

    it('should throw an error when the model is not registered', function () {
      const throwable = () => {
        const dbs = new DatabaseSchema();
        const S = dbs.getService(JsonSchemaGenerator);
        S.genSchema('model');
      };
      expect(throwable).to.throw('Model "model" is not defined.');
    });

    describe('generating an implicit primary key', function () {
      it('should inject a primary key if a datasource is defined', function () {
        const dbs = new DatabaseSchema();
        dbs.defineDatasource({name: 'memory', adapter: 'memory'});
        dbs.defineModel({name: 'modelWithDb', datasource: 'memory'});
        const S = dbs.getService(JsonSchemaGenerator);
        const schema = S.genSchema('modelWithDb');
        expect(schema.properties).to.have.property(
          DEFAULT_PRIMARY_KEY_PROPERTY_NAME,
        );
      });

      it('should inject a primary key at the beginning of the properties object', function () {
        const dbs = new DatabaseSchema();
        dbs.defineDatasource({
          name: 'memory',
          adapter: 'memory',
        });
        dbs.defineModel({
          name: 'modelWithDbAndProps',
          datasource: 'memory',
          properties: {
            firstName: DataType.STRING,
            age: DataType.NUMBER,
          },
        });
        const S = dbs.getService(JsonSchemaGenerator);
        const schema = S.genSchema('modelWithDbAndProps');
        const propertyKeys = Object.keys(schema.properties);
        expect(propertyKeys[0]).to.be.eq(DEFAULT_PRIMARY_KEY_PROPERTY_NAME);
        expect(propertyKeys[1]).to.be.eq('firstName');
        expect(propertyKeys[2]).to.be.eq('age');
      });

      it('should not inject a primary key if a datasource is not defined', function () {
        const dbs = new DatabaseSchema();
        dbs.defineModel({name: 'modelWithoutDb'});
        const S = dbs.getService(JsonSchemaGenerator);
        const schema = S.genSchema('modelWithoutDb');
        expect(schema.properties).to.not.have.property(
          DEFAULT_PRIMARY_KEY_PROPERTY_NAME,
        );
      });
    });

    describe('processing explicit properties', function () {
      it('should map explicitly defined properties to the "properties" object', function () {
        const dbs = new DatabaseSchema();
        dbs.defineModel({
          name: 'model',
          properties: {
            foo: DataType.STRING,
            bar: {type: DataType.NUMBER},
          },
        });
        const S = dbs.getService(JsonSchemaGenerator);
        const schema = S.genSchema('model');
        expect(schema.properties).to.have.property('foo');
        expect(schema.properties.foo).to.be.eql({type: 'string'});
        expect(schema.properties).to.have.property('bar');
        expect(schema.properties.bar).to.be.eql({type: 'number'});
      });

      it('should exclude properties specified in the "excludeProperties" option', function () {
        const dbs = new DatabaseSchema();
        dbs.defineModel({
          name: 'model',
          properties: {
            foo: DataType.STRING,
            bar: DataType.NUMBER,
            baz: DataType.BOOLEAN,
          },
        });
        const S = dbs.getService(JsonSchemaGenerator);
        const schema = S.genSchema('model', {
          excludeProperties: ['bar', 'baz'],
        });
        expect(schema.properties).to.have.property('foo');
        expect(schema.properties).to.not.have.property('bar');
        expect(schema.properties).to.not.have.property('baz');
      });

      it('should add required properties to the "required" array', function () {
        const dbs = new DatabaseSchema();
        dbs.defineModel({
          name: 'model',
          properties: {
            foo: {type: DataType.STRING, required: true},
            bar: DataType.NUMBER,
            baz: {type: DataType.BOOLEAN, required: true},
            qux: {type: DataType.STRING},
          },
        });
        const S = dbs.getService(JsonSchemaGenerator);
        const schema = S.genSchema('model');
        expect(schema.required).to.be.an('array');
        expect(schema.required).to.be.eql(['foo', 'baz']);
      });

      it('should not create the "required" array if there are no required properties', function () {
        const dbs = new DatabaseSchema();
        dbs.defineModel({
          name: 'model',
          properties: {
            foo: DataType.STRING,
            bar: {type: DataType.NUMBER},
          },
        });
        const S = dbs.getService(JsonSchemaGenerator);
        const schema = S.genSchema('model');
        expect(schema.required).to.be.undefined;
      });

      it('should not add a required property to the "required" array if it is excluded', function () {
        const dbs = new DatabaseSchema();
        dbs.defineModel({
          name: 'model',
          properties: {
            foo: {type: DataType.STRING, required: true},
            bar: {type: DataType.NUMBER, required: true},
          },
        });
        const S = dbs.getService(JsonSchemaGenerator);
        const schema = S.genSchema('model', {
          excludeProperties: ['bar'],
        });
        expect(schema.properties).to.not.have.property('bar');
        expect(schema.required).to.be.eql(['foo']);
      });
    });

    describe('injecting implicit foreign keys', function () {
      it('should inject an implicit foreign key for a regular "belongsTo" relation', function () {
        const dbs = new DatabaseSchema();
        dbs.defineModel({
          name: 'targetModel',
        });
        dbs.defineModel({
          name: 'sourceModel',
          relations: {
            target: {
              type: RelationType.BELONGS_TO,
              model: 'targetModel',
            },
          },
        });
        const S = dbs.getService(JsonSchemaGenerator);
        const schema = S.genSchema('sourceModel');
        expect(schema.properties).to.have.property('targetId');
        expect(schema.properties.targetId).to.be.eql({type: 'number'});
      });

      it('should use a custom foreign key name if provided in "belongsTo" relation', function () {
        const dbs = new DatabaseSchema();
        dbs.defineModel({
          name: 'targetModel',
        });
        dbs.defineModel({
          name: 'sourceModel',
          relations: {
            target: {
              type: RelationType.BELONGS_TO,
              model: 'targetModel',
              foreignKey: 'myCustomTargetId',
            },
          },
        });
        const S = dbs.getService(JsonSchemaGenerator);
        const schema = S.genSchema('sourceModel');
        expect(schema.properties).to.not.have.property('targetId');
        expect(schema.properties).to.have.property('myCustomTargetId');
        expect(schema.properties.myCustomTargetId).to.be.eql({type: 'number'});
      });

      it('should infer foreign key type from the primary key of a target model', function () {
        const dbs = new DatabaseSchema();
        dbs.defineModel({
          name: 'targetModel',
          properties: {
            id: {
              type: DataType.STRING,
              primaryKey: true,
            },
          },
        });
        dbs.defineModel({
          name: 'sourceModel',
          relations: {
            target: {
              type: RelationType.BELONGS_TO,
              model: 'targetModel',
            },
          },
        });
        const S = dbs.getService(JsonSchemaGenerator);
        const schema = S.genSchema('sourceModel');
        expect(schema.properties).to.have.property('targetId');
        expect(schema.properties.targetId).to.be.eql({type: 'string'});
      });

      it('should inject foreign key and discriminator for a polymorphic "belongsTo" relation', function () {
        const dbs = new DatabaseSchema();
        dbs.defineModel({
          name: 'model',
          relations: {
            parent: {
              type: RelationType.BELONGS_TO,
              polymorphic: true,
            },
          },
        });
        const S = dbs.getService(JsonSchemaGenerator);
        const schema = S.genSchema('model');
        expect(schema.properties).to.have.property('parentId');
        expect(schema.properties.parentId).to.be.eql({type: 'number'});
        expect(schema.properties).to.have.property('parentType');
        expect(schema.properties.parentType).to.be.eql({type: 'string'});
      });

      it('should use custom names for a polymorphic "belongsTo" relation', function () {
        const dbs = new DatabaseSchema();
        dbs.defineModel({
          name: 'model',
          relations: {
            parent: {
              type: RelationType.BELONGS_TO,
              polymorphic: true,
              foreignKey: 'refId',
              discriminator: 'refType',
            },
          },
        });
        const S = dbs.getService(JsonSchemaGenerator);
        const schema = S.genSchema('model');
        expect(schema.properties).to.have.property('refId');
        expect(schema.properties).to.have.property('refType');
      });

      it('should inject an array of foreign keys for a "referencesMany" relation', function () {
        const dbs = new DatabaseSchema();
        dbs.defineModel({
          name: 'targetModel',
          properties: {
            id: {
              type: DataType.STRING,
              primaryKey: true,
            },
          },
        });
        dbs.defineModel({
          name: 'sourceModel',
          relations: {
            categories: {
              type: RelationType.REFERENCES_MANY,
              model: 'targetModel',
            },
          },
        });
        const S = dbs.getService(JsonSchemaGenerator);
        const schema = S.genSchema('sourceModel');
        expect(schema.properties).to.have.property('categoryIds');
        expect(schema.properties.categoryIds).to.be.eql({
          type: 'array',
          items: {type: 'string'},
        });
      });

      it('should not inject foreign keys for a "hasOne" relation', function () {
        const dbs = new DatabaseSchema();
        dbs.defineModel({
          name: 'targetModel',
        });
        dbs.defineModel({
          name: 'sourceModel',
          relations: {
            childOne: {
              type: RelationType.HAS_ONE,
              model: 'targetModel',
              foreignKey: 'sourceId',
            },
          },
        });
        const S = dbs.getService(JsonSchemaGenerator);
        const schema = S.genSchema('sourceModel');
        expect(schema.properties).to.not.have.property('childOneId');
        expect(schema.properties).to.not.have.property('sourceId');
      });

      it('should not inject foreign keys for a "hasMany" relation', function () {
        const dbs = new DatabaseSchema();
        dbs.defineModel({
          name: 'targetModel',
        });
        dbs.defineModel({
          name: 'sourceModel',
          relations: {
            childrenMany: {
              type: RelationType.HAS_MANY,
              model: 'targetModel',
              foreignKey: 'sourceId',
            },
          },
        });
        const S = dbs.getService(JsonSchemaGenerator);
        const schema = S.genSchema('sourceModel');
        expect(schema.properties).to.not.have.property('childrenManyIds');
        expect(schema.properties).to.not.have.property('sourceId');
      });

      it('should not overwrite explicitly defined properties with a "belongsTo" definition', function () {
        const dbs = new DatabaseSchema();
        dbs.defineModel({
          name: 'targetModel',
        });
        dbs.defineModel({
          name: 'sourceModel',
          properties: {
            targetId: {
              type: DataType.STRING,
            },
          },
          relations: {
            target: {
              type: RelationType.BELONGS_TO,
              model: 'targetModel',
            },
          },
        });
        const S = dbs.getService(JsonSchemaGenerator);
        const schema = S.genSchema('sourceModel');
        expect(schema.properties).to.have.property('targetId');
        expect(schema.properties.targetId).to.be.eql({type: 'string'});
      });

      it('should not overwrite explicitly defined properties with a "referencesMany" definition', function () {
        const dbs = new DatabaseSchema();
        dbs.defineModel({
          name: 'targetModel',
        });
        dbs.defineModel({
          name: 'sourceModel',
          properties: {
            targetIds: {
              type: DataType.ARRAY,
              itemType: DataType.STRING,
            },
          },
          relations: {
            targets: {
              type: RelationType.REFERENCES_MANY,
              model: 'targetModel',
            },
          },
        });
        const S = dbs.getService(JsonSchemaGenerator);
        const schema = S.genSchema('sourceModel');
        expect(schema.properties).to.have.property('targetIds');
        expect(schema.properties.targetIds).to.be.eql({
          type: 'array',
          items: {type: 'string'},
        });
      });

      it('should not inject foreign keys if they are in "excludeProperties" option', function () {
        const dbs = new DatabaseSchema();
        dbs.defineModel({
          name: 'targetModel',
        });
        dbs.defineModel({
          name: 'sourceModel',
          relations: {
            target: {
              type: RelationType.BELONGS_TO,
              model: 'targetModel',
            },
          },
        });
        const S = dbs.getService(JsonSchemaGenerator);
        const schema = S.genSchema('sourceModel', {
          excludeProperties: ['targetId'],
        });
        expect(schema.properties).to.not.have.property('targetId');
      });

      it('should throw an error if a target model of a relation is not defined', function () {
        const dbs = new DatabaseSchema();
        dbs.defineModel({
          name: 'model',
          relations: {
            target: {
              type: RelationType.BELONGS_TO,
              model: 'unknownModel',
            },
          },
        });
        const S = dbs.getService(JsonSchemaGenerator);
        const throwable = () => S.genSchema('model');
        expect(throwable).to.throw(
          'Model "unknownModel" must be registered ' +
            'before generating a JSON Schema.',
        );
      });
    });

    describe('extension keywords (x-js-*)', function () {
      it('should extract extension keywords from a model definition and apply them without prefix', function () {
        const dbs = new DatabaseSchema();
        dbs.defineModel({
          name: 'user',
          'x-js-title': 'User Model',
          'x-js-description': 'Schema for user',
        });
        const S = dbs.getService(JsonSchemaGenerator);
        const schema = S.genSchema('user');
        expect(schema.title).to.be.eq('User Model');
        expect(schema.description).to.be.eq('Schema for user');
        expect(schema['x-js-title']).to.be.undefined;
      });

      it('should extract extension keywords from a property definition and apply them without prefix', function () {
        const dbs = new DatabaseSchema();
        dbs.defineModel({
          name: 'user',
          properties: {
            email: {
              type: DataType.STRING,
              'x-js-format': 'email',
              'x-js-description': 'User email address',
            },
          },
        });
        const S = dbs.getService(JsonSchemaGenerator);
        const schema = S.genSchema('user');
        expect(schema.properties.email.format).to.be.eq('email');
        expect(schema.properties.email.description).to.be.eq(
          'User email address',
        );
        expect(schema.properties.email['x-js-format']).to.be.undefined;
      });
    });

    describe('inheritance (hierarchy flattening)', function () {
      it('should flatten properties from base models', function () {
        const dbs = new DatabaseSchema();
        dbs.defineModel({
          name: 'baseModel',
          properties: {
            baseProp: DataType.STRING,
          },
        });
        dbs.defineModel({
          name: 'childModel',
          base: 'baseModel',
          properties: {
            childProp: DataType.NUMBER,
          },
        });
        const S = dbs.getService(JsonSchemaGenerator);
        const schema = S.genSchema('childModel');
        expect(schema.allOf).to.be.undefined;
        expect(schema.properties).to.have.property('baseProp');
        expect(schema.properties.baseProp).to.be.eql({type: 'string'});
        expect(schema.properties).to.have.property('childProp');
        expect(schema.properties.childProp).to.be.eql({type: 'number'});
      });

      it('should inherit a primary key definition from a base model', function () {
        const dbs = new DatabaseSchema();
        dbs.defineDatasource({name: 'memory', adapter: 'memory'});
        dbs.defineModel({
          name: 'baseModel',
          datasource: 'memory',
          properties: {
            customId: {
              type: DataType.STRING,
              primaryKey: true,
            },
          },
        });
        dbs.defineModel({
          name: 'childModel',
          base: 'baseModel',
          datasource: 'memory',
        });
        const S = dbs.getService(JsonSchemaGenerator);
        const schema = S.genSchema('childModel');
        expect(schema.properties).to.not.have.property(
          DEFAULT_PRIMARY_KEY_PROPERTY_NAME,
        );
        expect(schema.properties).to.have.property('customId');
        expect(schema.properties.customId).to.be.eql({type: 'string'});
      });

      it('should use a primary key definition from a child model', function () {
        const dbs = new DatabaseSchema();
        dbs.defineDatasource({name: 'memory', adapter: 'memory'});
        dbs.defineModel({
          name: 'baseModel',
          datasource: 'memory',
          properties: {
            baseProp: DataType.NUMBER,
          },
        });
        dbs.defineModel({
          name: 'childModel',
          base: 'baseModel',
          datasource: 'memory',
          properties: {
            customId: {
              type: DataType.STRING,
              primaryKey: true,
            },
          },
        });
        const S = dbs.getService(JsonSchemaGenerator);
        const schema = S.genSchema('childModel');
        expect(schema.properties).to.not.have.property(
          DEFAULT_PRIMARY_KEY_PROPERTY_NAME,
        );
        expect(schema.properties).to.have.property('baseProp');
        expect(schema.properties.baseProp).to.be.eql({type: 'number'});
        expect(schema.properties).to.have.property('customId');
        expect(schema.properties.customId).to.be.eql({type: 'string'});
      });

      it('should flatten relations and inject foreign keys from base models', function () {
        const dbs = new DatabaseSchema();
        dbs.defineModel({
          name: 'targetModel',
        });
        dbs.defineModel({
          name: 'baseModel',
          relations: {
            baseTarget: {
              type: RelationType.BELONGS_TO,
              model: 'targetModel',
            },
          },
        });
        dbs.defineModel({
          name: 'childModel',
          base: 'baseModel',
          relations: {
            childTarget: {
              type: RelationType.BELONGS_TO,
              model: 'targetModel',
            },
          },
        });
        const S = dbs.getService(JsonSchemaGenerator);
        const schema = S.genSchema('childModel');

        expect(schema.properties).to.have.property('baseTargetId');
        expect(schema.properties).to.have.property('childTargetId');
      });

      it('should override base properties in a child model', function () {
        const dbs = new DatabaseSchema();
        dbs.defineModel({
          name: 'baseModel',
          properties: {
            sharedProp: DataType.STRING,
          },
        });
        dbs.defineModel({
          name: 'childModel',
          base: 'baseModel',
          properties: {
            sharedProp: DataType.NUMBER,
          },
        });
        const S = dbs.getService(JsonSchemaGenerator);
        const schema = S.genSchema('childModel');

        expect(schema.properties.sharedProp).to.be.eql({type: 'number'});
      });

      it('should collect required fields from the entire hierarchy properly', function () {
        const dbs = new DatabaseSchema();
        dbs.defineModel({
          name: 'baseModel',
          properties: {
            baseProp: {
              type: DataType.STRING,
              required: true,
            },
            overridableProp: {
              type: DataType.STRING,
              required: true,
            },
          },
        });
        dbs.defineModel({
          name: 'childModel',
          base: 'baseModel',
          properties: {
            childProp: {
              type: DataType.STRING,
              required: true,
            },
            overridableProp: {
              type: DataType.STRING,
              required: false,
            },
          },
        });
        const S = dbs.getService(JsonSchemaGenerator);
        const schema = S.genSchema('childModel');
        expect(schema.required).to.be.an('array');
        expect(schema.required).to.include('baseProp');
        expect(schema.required).to.include('childProp');
        expect(schema.required).to.not.include('overridableProp');
      });
    });
  });

  describe('_validateOptions', function () {
    it('should require the option "excludeProperties" to be an Array', function () {
      const dbs = new DatabaseSchema();
      const S = dbs.getService(JsonSchemaGenerator);
      const throwable = v => () => {
        return S._validateOptions({excludeProperties: v});
      };
      const error = s =>
        format(
          'Option "excludeProperties" must be an Array, but %s was given.',
          s,
        );
      expect(throwable('str')).to.throw(error('"str"'));
      expect(throwable('')).to.throw(error('""'));
      expect(throwable(10)).to.throw(error('10'));
      expect(throwable(0)).to.throw(error('0'));
      expect(throwable(true)).to.throw(error('true'));
      expect(throwable(false)).to.throw(error('false'));
      expect(throwable({})).to.throw(error('Object'));
      expect(throwable(null)).to.throw(error('null'));
      throwable([])();
      throwable(undefined)();
    });

    it('should require elements of the option "excludeProperties" to be a non-empty String', function () {
      const dbs = new DatabaseSchema();
      const S = dbs.getService(JsonSchemaGenerator);
      const throwable = v => () => {
        return S._validateOptions({excludeProperties: [v]});
      };
      const error = s =>
        format(
          'Element 0 of the option "excludeProperties" ' +
            'must be a non-empty String, but %s was given.',
          s,
        );
      expect(throwable('')).to.throw(error('""'));
      expect(throwable(10)).to.throw(error('10'));
      expect(throwable(0)).to.throw(error('0'));
      expect(throwable(true)).to.throw(error('true'));
      expect(throwable(false)).to.throw(error('false'));
      expect(throwable([])).to.throw(error('Array'));
      expect(throwable({})).to.throw(error('Object'));
      expect(throwable(undefined)).to.throw(error('undefined'));
      expect(throwable(null)).to.throw(error('null'));
      throwable('field')();
    });

    it('should require the option "refFactory" to be a Function', function () {
      const dbs = new DatabaseSchema();
      const S = dbs.getService(JsonSchemaGenerator);
      const throwable = v => () => {
        return S._validateOptions({refFactory: v});
      };
      const error = s =>
        format('Option "refFactory" must be a Function, but %s was given.', s);
      expect(throwable('str')).to.throw(error('"str"'));
      expect(throwable('')).to.throw(error('""'));
      expect(throwable(10)).to.throw(error('10'));
      expect(throwable(0)).to.throw(error('0'));
      expect(throwable(true)).to.throw(error('true'));
      expect(throwable(false)).to.throw(error('false'));
      expect(throwable([])).to.throw(error('Array'));
      expect(throwable({})).to.throw(error('Object'));
      expect(throwable(null)).to.throw(error('null'));
      throwable(() => ({}))();
      throwable(undefined)();
    });

    it('should require the option "defaultPrimaryKeyType" to be a correct value', function () {
      const dbs = new DatabaseSchema();
      const S = dbs.getService(JsonSchemaGenerator);
      const throwable = v => () => {
        return S._validateOptions({defaultPrimaryKeyType: v});
      };
      const error = s =>
        format(
          'Option "defaultPrimaryKeyType" allows "number" ' +
            'or "string" value, but %s was given.',
          s,
        );
      expect(throwable('str')).to.throw(error('"str"'));
      expect(throwable('')).to.throw(error('""'));
      expect(throwable(10)).to.throw(error('10'));
      expect(throwable(0)).to.throw(error('0'));
      expect(throwable(true)).to.throw(error('true'));
      expect(throwable(false)).to.throw(error('false'));
      expect(throwable([])).to.throw(error('Array'));
      expect(throwable({})).to.throw(error('Object'));
      expect(throwable(null)).to.throw(error('null'));
      throwable('string')();
      throwable('number')();
      throwable(undefined)();
    });
  });

  describe('_normalizeOptions', function () {
    it('should return existing options as is', function () {
      const S = new JsonSchemaGenerator();
      const options = {
        excludeProperties: ['test'],
        refFactory: modelName => ({$ref: modelName}),
        defaultPrimaryKeyType: 'string',
      };
      const res = S._normalizeOptions(options);
      expect(res.excludeProperties).to.be.eq(options.excludeProperties);
      expect(res.refFactory).to.be.eq(options.refFactory);
      expect(res.defaultPrimaryKeyType).to.be.eq(options.defaultPrimaryKeyType);
    });

    it('should set default values for non-existing options', function () {
      const S = new JsonSchemaGenerator();
      const res = S._normalizeOptions({});
      expect(res.excludeProperties).to.be.eql([]);
      expect(res.refFactory).to.be.a('function');
      expect(res.defaultPrimaryKeyType).to.be.eq('number');
    });
  });

  describe('_mapPropertyToSchema', function () {
    it('should return a schema for a short property definition', function () {
      const S = new JsonSchemaGenerator();
      const res = S._mapPropertyToSchema(DataType.STRING);
      expect(res).to.be.eql({type: 'string'});
    });

    it('should return a schema for a full property definition', function () {
      const S = new JsonSchemaGenerator();
      const res = S._mapPropertyToSchema({type: DataType.STRING});
      expect(res).to.be.eql({type: 'string'});
    });

    it('should return an empty object when no property definition was given', function () {
      const S = new JsonSchemaGenerator();
      const res = S._mapPropertyToSchema();
      expect(res).to.be.eql({});
    });

    it('should return a result from the reference factory for an object definition with a model', function () {
      const S = new JsonSchemaGenerator();
      const res = S._mapPropertyToSchema(
        {type: DataType.OBJECT, model: 'test'},
        {refFactory: modelName => ({$ref: `#/${modelName}`})},
      );
      expect(res).to.be.eql({$ref: '#/test'});
    });

    it('should return a result from the reference factory for an array definition with a model', function () {
      const S = new JsonSchemaGenerator();
      const res = S._mapPropertyToSchema(
        {type: DataType.ARRAY, itemModel: 'test'},
        {refFactory: modelName => ({$ref: `#/${modelName}`})},
      );
      expect(res).to.be.eql({
        type: 'array',
        items: {$ref: '#/test'},
      });
    });

    it('should set items schema when the "itemType" parameter is specified', function () {
      const S = new JsonSchemaGenerator();
      const res = S._mapPropertyToSchema({
        type: DataType.ARRAY,
        itemType: DataType.NUMBER,
      });
      expect(res).to.be.eql({
        type: 'array',
        items: {type: 'number'},
      });
    });

    it('should set a default value when the "default" parameter is specified', function () {
      const S = new JsonSchemaGenerator();
      const res = S._mapPropertyToSchema({
        type: DataType.STRING,
        default: 'test',
      });
      expect(res).to.be.eql({
        type: 'string',
        default: 'test',
      });
    });

    it('should set keyowrd-extensions to a result schema without the prefix', function () {
      const S = new JsonSchemaGenerator();
      const res = S._mapPropertyToSchema({
        type: DataType.STRING,
        'x-js-examples': ['foo', 'bar'],
      });
      expect(res).to.be.eql({
        type: 'string',
        examples: ['foo', 'bar'],
      });
    });
  });

  describe('_createSchemaByType', function () {
    it('should return a schema for a given type', function () {
      const S = new JsonSchemaGenerator();
      const fn = S._createSchemaByType.bind(S);
      expect(fn(DataType.STRING)).to.be.eql({type: 'string'});
      expect(fn(DataType.NUMBER)).to.be.eql({type: 'number'});
      expect(fn(DataType.BOOLEAN)).to.be.eql({type: 'boolean'});
      expect(fn(DataType.ARRAY)).to.be.eql({type: 'array'});
      expect(fn(DataType.OBJECT)).to.be.eql({type: 'object'});
      expect(fn(DataType.ANY)).to.be.eql({});
      expect(fn('unknown')).to.be.eql({type: 'unknown'});
    });
  });

  describe('_injectImplicitForeignKeys', function () {
    describe('belongsTo', function () {
      it('should inject a default foreign key for a "belongsTo" relation', function () {
        const dbs = new DatabaseSchema();
        const generator = dbs.getService(JsonSchemaGenerator);
        const relsDef = {user: {type: RelationType.BELONGS_TO}};
        const propsDef = {};
        const schema = {properties: {}};
        const options = {
          excludeProperties: [],
          defaultPrimaryKeyType: 'number',
        };
        generator._injectImplicitForeignKeys(
          relsDef,
          propsDef,
          schema,
          options,
        );
        expect(schema.properties).to.have.property('userId');
        expect(schema.properties.userId).to.be.eql({type: 'number'});
      });

      it('should use a custom foreignKey name for a "belongsTo" relation if provided', function () {
        const dbs = new DatabaseSchema();
        const generator = dbs.getService(JsonSchemaGenerator);
        const relsDef = {
          user: {
            type: RelationType.BELONGS_TO,
            foreignKey: 'ownerId',
          },
        };
        const propsDef = {};
        const schema = {properties: {}};
        const options = {
          excludeProperties: [],
          defaultPrimaryKeyType: 'string',
        };
        generator._injectImplicitForeignKeys(
          relsDef,
          propsDef,
          schema,
          options,
        );
        expect(schema.properties).to.not.have.property('userId');
        expect(schema.properties).to.have.property('ownerId');
        expect(schema.properties.ownerId).to.be.eql({type: 'string'});
      });

      it('should not inject a foreign key if it is already defined in properties', function () {
        const dbs = new DatabaseSchema();
        const generator = dbs.getService(JsonSchemaGenerator);
        const relsDef = {user: {type: RelationType.BELONGS_TO}};
        const propsDef = {userId: {type: DataType.STRING}};
        const schema = {properties: {}};
        const options = {
          excludeProperties: [],
          defaultPrimaryKeyType: 'number',
        };
        generator._injectImplicitForeignKeys(
          relsDef,
          propsDef,
          schema,
          options,
        );
        // ожидается, что ключ не будет добавлен, так как он уже есть в propsDef,
        // основной цикл генерации свойств должен был добавить его ранее
        expect(schema.properties).to.not.have.property('userId');
      });

      it('should not inject a foreign key if it is listed in excluded properties', function () {
        const dbs = new DatabaseSchema();
        const generator = dbs.getService(JsonSchemaGenerator);
        const relsDef = {user: {type: RelationType.BELONGS_TO}};
        const propsDef = {};
        const schema = {properties: {}};
        const options = {
          excludeProperties: ['userId'],
          defaultPrimaryKeyType: 'number',
        };
        generator._injectImplicitForeignKeys(
          relsDef,
          propsDef,
          schema,
          options,
        );
        expect(schema.properties).to.not.have.property('userId');
      });

      it("should infer foreign key type from the target model's primary key", function () {
        const dbs = new DatabaseSchema();
        dbs.defineModel({
          name: 'model',
          properties: {
            id: {
              type: DataType.STRING,
              primaryKey: true,
            },
          },
        });
        const generator = dbs.getService(JsonSchemaGenerator);
        const relsDef = {
          target: {
            type: RelationType.BELONGS_TO,
            model: 'model',
          },
        };
        const propsDef = {};
        const schema = {properties: {}};
        const options = {
          excludeProperties: [],
          defaultPrimaryKeyType: 'number',
        };
        generator._injectImplicitForeignKeys(
          relsDef,
          propsDef,
          schema,
          options,
        );
        expect(schema.properties).to.have.property('targetId');
        expect(schema.properties.targetId).to.be.eql({type: 'string'});
      });
    });

    describe('belongsTo (polymorphic)', function () {
      it('should inject a discriminator property for a polymorphic "belongsTo" relation', function () {
        const dbs = new DatabaseSchema();
        const generator = dbs.getService(JsonSchemaGenerator);
        const relsDef = {
          parent: {
            type: RelationType.BELONGS_TO,
            polymorphic: true,
          },
        };
        const propsDef = {};
        const schema = {properties: {}};
        const options = {
          excludeProperties: [],
          defaultPrimaryKeyType: 'number',
        };
        generator._injectImplicitForeignKeys(
          relsDef,
          propsDef,
          schema,
          options,
        );
        expect(schema.properties).to.have.property('parentId');
        expect(schema.properties.parentId).to.be.eql({type: 'number'});
        expect(schema.properties).to.have.property('parentType');
        expect(schema.properties.parentType).to.be.eql({type: 'string'});
      });

      it('should use a custom discriminator name for a polymorphic "belongsTo" relation if provided', function () {
        const dbs = new DatabaseSchema();
        const generator = dbs.getService(JsonSchemaGenerator);
        const relsDef = {
          parent: {
            type: RelationType.BELONGS_TO,
            polymorphic: true,
            discriminator: 'targetModelName',
          },
        };
        const propsDef = {};
        const schema = {properties: {}};
        const options = {
          excludeProperties: [],
          defaultPrimaryKeyType: 'number',
        };
        generator._injectImplicitForeignKeys(
          relsDef,
          propsDef,
          schema,
          options,
        );
        expect(schema.properties).to.not.have.property('parentType');
        expect(schema.properties).to.have.property('targetModelName');
        expect(schema.properties.targetModelName).to.be.eql({type: 'string'});
      });

      it('should not inject a discriminator if it is already defined in properties', function () {
        const dbs = new DatabaseSchema();
        const generator = dbs.getService(JsonSchemaGenerator);
        const relsDef = {
          parent: {
            type: RelationType.BELONGS_TO,
            polymorphic: true,
          },
        };
        const propsDef = {parentType: {type: DataType.STRING}};
        const schema = {properties: {}};
        const options = {
          excludeProperties: [],
          defaultPrimaryKeyType: 'number',
        };
        generator._injectImplicitForeignKeys(
          relsDef,
          propsDef,
          schema,
          options,
        );
        expect(schema.properties).to.not.have.property('parentType');
        expect(schema.properties).to.have.property('parentId');
      });

      it('should not inject a discriminator if it is listed in excluded properties', function () {
        const dbs = new DatabaseSchema();
        const generator = dbs.getService(JsonSchemaGenerator);
        const relsDef = {
          parent: {
            type: RelationType.BELONGS_TO,
            polymorphic: true,
          },
        };
        const propsDef = {};
        const schema = {properties: {}};
        const options = {
          excludeProperties: ['parentType'],
          defaultPrimaryKeyType: 'number',
        };
        generator._injectImplicitForeignKeys(
          relsDef,
          propsDef,
          schema,
          options,
        );
        expect(schema.properties).to.not.have.property('parentType');
        expect(schema.properties).to.have.property('parentId');
      });
    });

    describe('hasOne', function () {
      it('should ignore a "hasOne" relation', function () {
        const dbs = new DatabaseSchema();
        const generator = dbs.getService(JsonSchemaGenerator);
        const relsDef = {
          child: {
            type: RelationType.HAS_ONE,
            model: 'targetModel',
          },
        };
        const propsDef = {};
        const schema = {properties: {}};
        const options = {
          excludeProperties: [],
          defaultPrimaryKeyType: 'number',
        };
        generator._injectImplicitForeignKeys(
          relsDef,
          propsDef,
          schema,
          options,
        );
        expect(schema.properties).to.be.empty;
      });
    });

    describe('hasMany', function () {
      it('should ignore a "hasMany" relation', function () {
        const dbs = new DatabaseSchema();
        const generator = dbs.getService(JsonSchemaGenerator);
        const relsDef = {
          children: {
            type: RelationType.HAS_MANY,
            model: 'targetModel',
          },
        };
        const propsDef = {};
        const schema = {properties: {}};
        const options = {
          excludeProperties: [],
          defaultPrimaryKeyType: 'number',
        };
        generator._injectImplicitForeignKeys(
          relsDef,
          propsDef,
          schema,
          options,
        );
        expect(schema.properties).to.be.empty;
      });
    });

    describe('referencesMany', function () {
      it('should inject an array of foreign keys for a "referencesMany" relation', function () {
        const dbs = new DatabaseSchema();
        const generator = dbs.getService(JsonSchemaGenerator);
        const relsDef = {categories: {type: RelationType.REFERENCES_MANY}};
        const propsDef = {};
        const schema = {properties: {}};
        const options = {
          excludeProperties: [],
          defaultPrimaryKeyType: 'number',
        };
        generator._injectImplicitForeignKeys(
          relsDef,
          propsDef,
          schema,
          options,
        );
        expect(schema.properties).to.have.property('categoryIds');
        expect(schema.properties.categoryIds).to.be.eql({
          type: 'array',
          items: {type: 'number'},
        });
      });

      it('should use a custom foreignKey name for a "referencesMany" relation if provided', function () {
        const dbs = new DatabaseSchema();
        const generator = dbs.getService(JsonSchemaGenerator);
        const relsDef = {
          categories: {
            type: RelationType.REFERENCES_MANY,
            foreignKey: 'arrayOfCategoryIds',
          },
        };
        const propsDef = {};
        const schema = {properties: {}};
        const options = {
          excludeProperties: [],
          defaultPrimaryKeyType: 'string',
        };
        generator._injectImplicitForeignKeys(
          relsDef,
          propsDef,
          schema,
          options,
        );
        expect(schema.properties).to.not.have.property('categoryIds');
        expect(schema.properties).to.have.property('arrayOfCategoryIds');
        expect(schema.properties.arrayOfCategoryIds).to.be.eql({
          type: 'array',
          items: {type: 'string'},
        });
      });

      it('should not inject foreign keys for a "referencesMany" relation if defined in properties', function () {
        const dbs = new DatabaseSchema();
        const generator = dbs.getService(JsonSchemaGenerator);
        const relsDef = {categories: {type: RelationType.REFERENCES_MANY}};
        const propsDef = {categoryIds: {type: DataType.ARRAY}};
        const schema = {properties: {}};
        const options = {
          excludeProperties: [],
          defaultPrimaryKeyType: 'number',
        };
        generator._injectImplicitForeignKeys(
          relsDef,
          propsDef,
          schema,
          options,
        );
        // ожидается, что ключ не будет добавлен, так как он уже есть в propsDef,
        // основной цикл генерации свойств должен был добавить его ранее
        expect(schema.properties).to.not.have.property('categoryIds');
      });

      it('should not inject foreign keys for "referencesMany" relation if listed in excluded properties', function () {
        const dbs = new DatabaseSchema();
        const generator = dbs.getService(JsonSchemaGenerator);
        const relsDef = {categories: {type: RelationType.REFERENCES_MANY}};
        const propsDef = {};
        const schema = {properties: {}};
        const options = {
          excludeProperties: ['categoryIds'],
          defaultPrimaryKeyType: 'number',
        };
        generator._injectImplicitForeignKeys(
          relsDef,
          propsDef,
          schema,
          options,
        );
        expect(schema.properties).to.not.have.property('categoryIds');
      });
    });
  });

  describe('_resolveForeignKeyDataType', function () {
    it('should return a default type if a given relation is polymorphic', function () {
      const dbs = new DatabaseSchema();
      const S = dbs.getService(JsonSchemaGenerator);
      const relDef = {
        type: RelationType.BELONGS_TO,
        polymorphic: true,
      };
      const options = {defaultPrimaryKeyType: 'string'};
      const res = S._resolveForeignKeyDataType(relDef, options);
      expect(res).to.be.eq('string');
    });

    it('should throw an error if a target model is not registered', function () {
      const dbs = new DatabaseSchema();
      const S = dbs.getService(JsonSchemaGenerator);
      const relDef = {
        type: RelationType.BELONGS_TO,
        model: 'unknownModel',
      };
      const options = {defaultPrimaryKeyType: 'number'};
      const throwable = () => S._resolveForeignKeyDataType(relDef, options);
      expect(throwable).to.throw(
        'Model "unknownModel" must be registered ' +
          'before generating a JSON Schema.',
      );
    });

    it('should return an explicit primary key type of the target model', function () {
      const dbs = new DatabaseSchema();
      dbs.defineModel({
        name: 'targetModel',
        properties: {
          customId: {
            type: DataType.STRING,
            primaryKey: true,
          },
        },
      });
      const S = dbs.getService(JsonSchemaGenerator);
      const relDef = {
        type: RelationType.BELONGS_TO,
        model: 'targetModel',
      };
      const options = {defaultPrimaryKeyType: 'number'};
      const res = S._resolveForeignKeyDataType(relDef, options);
      expect(res).to.be.eq(DataType.STRING);
    });

    it('should return a default type if a target model primary key type is any', function () {
      const dbs = new DatabaseSchema();
      dbs.defineModel({
        name: 'targetModel',
        properties: {
          id: {
            type: DataType.ANY,
            primaryKey: true,
          },
        },
      });
      const S = dbs.getService(JsonSchemaGenerator);
      const relDef = {
        type: RelationType.BELONGS_TO,
        model: 'targetModel',
      };
      const options = {defaultPrimaryKeyType: 'string'};
      const res = S._resolveForeignKeyDataType(relDef, options);
      expect(res).to.be.eq('string');
    });

    it('should return a default type if a target model does not have an explicit primary key', function () {
      const dbs = new DatabaseSchema();
      dbs.defineModel({
        name: 'targetModel',
        properties: {
          foo: DataType.STRING,
        },
      });
      const S = dbs.getService(JsonSchemaGenerator);
      const relDef = {
        type: RelationType.BELONGS_TO,
        model: 'targetModel',
      };
      const options = {defaultPrimaryKeyType: 'string'};
      const res = S._resolveForeignKeyDataType(relDef, options);
      expect(res).to.be.eq('string');
    });

    it('should fall back to a default type if an internal error occurs (e.g. circular inheritance)', function () {
      const dbs = new DatabaseSchema();
      // намеренно созданное циклическое наследование, которое вызовет ошибку
      // внутри ModelDefinitionUtils.getPropertiesDefinitionInBaseModelHierarchy
      dbs.defineModel({
        name: 'modelA',
        base: 'modelB',
      });
      dbs.defineModel({
        name: 'modelB',
        base: 'modelA',
      });
      const S = dbs.getService(JsonSchemaGenerator);
      const relDef = {
        type: RelationType.BELONGS_TO,
        model: 'modelA',
      };
      const options = {defaultPrimaryKeyType: 'number'};
      const res = S._resolveForeignKeyDataType(relDef, options);
      expect(res).to.be.eq('number');
    });
  });

  describe('_resolveExtensionKeywords', function () {
    it('returns an empty object if a definition has no keys starting with "x-js-" prefix', function () {
      const generator = new JsonSchemaGenerator();
      const def = {
        name: 'user',
        properties: {
          email: 'string',
        },
      };
      const result = generator._resolveExtensionKeywords(def);
      expect(result).to.be.eql({});
    });

    it('extracts keys starting with "x-js-" and removes the prefix', function () {
      const generator = new JsonSchemaGenerator();
      const def = {
        'x-js-title': 'User Model',
        'x-js-description': 'A user description',
      };
      const result = generator._resolveExtensionKeywords(def);
      expect(result).to.be.eql({
        title: 'User Model',
        description: 'A user description',
      });
    });

    it('ignores standard keys when extracting extensions', function () {
      const generator = new JsonSchemaGenerator();
      const def = {
        name: 'user',
        type: 'object',
        'x-js-format': 'email',
      };
      const result = generator._resolveExtensionKeywords(def);
      expect(result).to.be.eql({format: 'email'});
    });

    it('ignores keys that only equal the prefix "x-js-" without a suffix', function () {
      const generator = new JsonSchemaGenerator();
      const def = {
        'x-js-': 'invalid-empty-suffix',
        'x-js-valid': 'valid-suffix',
      };
      const result = generator._resolveExtensionKeywords(def);
      expect(result).to.be.eql({
        valid: 'valid-suffix',
      });
    });

    it('preserves complex structures as extension values', function () {
      const generator = new JsonSchemaGenerator();
      const def = {
        'x-js-examples': ['foo', 'bar'],
        'x-js-custom-meta': {nested: true, value: 123},
      };
      const result = generator._resolveExtensionKeywords(def);
      expect(result).to.be.eql({
        examples: ['foo', 'bar'],
        'custom-meta': {nested: true, value: 123},
      });
    });
  });
});
