import {expect} from 'chai';
import {format} from '@e22m4u/js-format';
import {JsonSchemaGenerator} from './json-schema-generator.js';

import {
  DataType,
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

    it('should inject a primary key at the beginning of the properties object', function () {
      const dbs = new DatabaseSchema();
      dbs.defineDatasource({name: 'memory', adapter: 'memory'});
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

    it('should not inject a primary key if a datasource is not defined', function () {
      const dbs = new DatabaseSchema();
      dbs.defineModel({name: 'modelWithoutDb'});
      const S = dbs.getService(JsonSchemaGenerator);
      const schema = S.genSchema('modelWithoutDb');
      expect(schema.properties).to.not.have.property(
        DEFAULT_PRIMARY_KEY_PROPERTY_NAME,
      );
    });

    describe('extension keywords (x-js-*)', function () {
      it('should extract extensions from model definition and apply them without prefix', function () {
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

      it('should extract extensions from property definition and apply them without prefix', function () {
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
