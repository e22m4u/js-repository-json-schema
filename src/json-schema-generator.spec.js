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

      it('should infer foreign key type from the target model primary key', function () {
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
          name: 'sourceModel',
          relations: {
            parent: {
              type: RelationType.BELONGS_TO,
              polymorphic: true,
            },
          },
        });
        const S = dbs.getService(JsonSchemaGenerator);
        const schema = S.genSchema('sourceModel');
        expect(schema.properties).to.have.property('parentId');
        expect(schema.properties.parentId).to.be.eql({type: 'number'});
        expect(schema.properties).to.have.property('parentType');
        expect(schema.properties.parentType).to.be.eql({type: 'string'});
      });

      it('should use custom names for a polymorphic "belongsTo" relation', function () {
        const dbs = new DatabaseSchema();
        dbs.defineModel({
          name: 'sourceModel',
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
        const schema = S.genSchema('sourceModel');
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

      it('should not inject foreign keys for "hasOne" and "hasMany" relations', function () {
        const dbs = new DatabaseSchema();
        dbs.defineModel({name: 'targetModel'});
        dbs.defineModel({
          name: 'sourceModel',
          relations: {
            childOne: {
              type: RelationType.HAS_ONE,
              model: 'targetModel',
              foreignKey: 'sourceId',
            },
            childrenMany: {
              type: RelationType.HAS_MANY,
              model: 'targetModel',
              foreignKey: 'sourceId',
            },
          },
        });
        const S = dbs.getService(JsonSchemaGenerator);
        const schema = S.genSchema('sourceModel');
        expect(schema.properties).to.not.have.property('childOneId');
        expect(schema.properties).to.not.have.property('childrenManyIds');
        expect(schema.properties).to.not.have.property('sourceId');
      });

      it('should not overwrite explicitly defined properties by a "belongsTo" definition', function () {
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

      it('should not overwrite explicitly defined properties by a "referencesMany" definition', function () {
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

      it('should throw an error if a relation target model is not defined', function () {
        const dbs = new DatabaseSchema();
        dbs.defineModel({
          name: 'sourceModel',
          relations: {
            target: {
              type: RelationType.BELONGS_TO,
              model: 'unknownModel',
            },
          },
        });
        const S = dbs.getService(JsonSchemaGenerator);
        const throwable = () => S.genSchema('sourceModel');
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
  });
});
