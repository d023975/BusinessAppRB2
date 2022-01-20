
const util = {
    /**
     * @template X
     * @param {X|Array<X>}
     * @returns {Array<X>}
     */
    asArray(x) {
        return Array.isArray(x) ? x : [ x ];
    },

    /**
     *
     * @param {string} msg
     * @returns {never}
     */
    throwError(msg) {
        throw new Error(msg);
    },

    /**
     * @param {{name: string}|string} entity
     * @param {{name: string}|string} association
     * @param {string} msg
     * @returns {never}
     */
    throwAssocError(entity, association, msg) {
        throw new Error(`Error with association "${association.name || association}" of entity "${entity.name || entity}": ${msg}`);
    },

    assertIsAssocation(entity, association) {
      if (!(association.type === "cds.Association" || association.type === "cds.Composition"))
        throw new Error(`Element "${association.name}" of entity "${entity.name}" is not an association or composition.`);
    },

    getEntity(absoluteName) {
        const [serviceName, entityName] = absoluteName.split(".");
        return cds.services[serviceName] && cds.services[serviceName].entities[entityName] || this.throwError(`Unknown entity "${absoluteName}"`);
    },

    targetServiceNameOfEntity(entityName) {
        let entity = cds.model.definitions[entityName];
        let sourceService = entity._service;

        for (;;) {
            const service = entity._service;
            if (service && service.name !== sourceService.name) {
            return service.name;
            }

            if (!entity.query) return undefined;
            entity = entity.query._target;
        }
    },

    targetServiceOfEntity(entityName) {
        const serviceName = util.targetServiceNameOfEntity(entityName);
        return serviceName ? cds.services[serviceName] : cds.services["db"];
    },

    association(entity, associationName, recursion = 0) {
        if (++recursion > 2) this.throwAssocError(entity, association, "Association has recursive definition.");

        const association = entity.elements[associationName] || this.throwAssocError(entity, associationName, `Association does not exists`);
        this.assertIsAssocation(entity, association);

        let keyMapping = util.associationKeys(entity, association);
        if (!keyMapping) {
          keyMapping = util.associationOn(entity, association);
        }
        if (!keyMapping) {
          keyMapping = util.associationOnSelf(entity, association, recursion);
        }

        if (!keyMapping) this.throwAssocError(entity, association, "Only associations with key fields or on conidition with one or multiple fields with equal conditions are supported.");

        return {
          keyMapping,
          is2many: association.is2many,
          is2one: association.is2one,
          entity,
          target: util.getEntity(association.target)
        };
      },

      /**
       * Association with "on" condition
       *
       * @example
       * entity Notes {
       *   supplier_ID : Suppliers:ID;
       *   supplier: Association to Suppliers on supplier.ID = supplier_ID;
       * }
       *
       * -->
       *
       * { association: { on: { [
       *   ref: [ 'supplier', 'ID' ], // <association>.<target-field>
       *   '=',
       *   ref: [ 'supplier_ID' ] // <source-field>
       * ] }}}
       *
       * @param {*} entity
       * @param {*} association
       * @returns
       */
      associationOn(entity, association) {
        const onLength = association.on && association.on.length || 0;
        if (onLength === 0) return;

        const on = association.on;
        const it = on[Symbol.iterator]();
        const fetch = (mandatory) => {
          const {done, value} = it.next();
          if (done && mandatory) throw new Error("Unexpected end of on condition");
          return value;
        }

        const keyMapping = {};

        for (;;) {
          const a = fetch(false);
          if (!a) break;
          const aRef = this.assocRef(association, a);

          const condition = fetch();
          if (condition !== "=") this.throwAssocError(entity, association, "Association on condition must contain only equal conditions");

          const bRef = this.assocRef(association, fetch());
          if (aRef.scope + bRef.scope !== 1) this.throwAssocError(entity, association, "Association on condition must contain only equal conditions");

          const [source, target] = aRef.scope === 0 ? [ aRef.ref, bRef.ref ] : [ bRef.ref, aRef.ref ];

          keyMapping[source] = target;
        }

        return keyMapping;
      },

      assocRef(association, obj) {
        if (!obj.ref) throw new Error("Association on condition wrong.");
        let ref = obj.ref;
        const assocRef = {};
        if (ref[0] === association.name) {
          assocRef.scope = 1;
          ref = [ ...ref ].splice(1);
        } else {
          assocRef.scope = 0;
        }
        assocRef.ref  = ref.join("_");
        return assocRef;
      },

      /**
       *
       * @example
       * extend entity BusinessPartner {
       *   notes: Composition of many Notes on notes = $self;
       * }
       *
       * @param {*} entity
       * @param {*} association
       * @returns
       */

      associationOnSelf(entity, association) {
        const onLength = association.on && association.on.length || 0;
        if (onLength === 0) return;

        const on = association.on;
        if (!(onLength === 3 && on[0] && on[0].ref && on[1] === "=" && on[2] && on[2].ref[0] === "$self")) return; //throwAssocError(entity, association, "Association on condition must compare to $self");

        const reverseAssociationName = association.on[0].ref[1];
        const reverseAssociationMetaData = util.association(entity, reverseAssociationName, false);

        return {
          keyFieldName: reverseAssociationMetaData.targetKeyFieldName,
          targetKeyFieldName: reverseAssociationMetaData.keyFieldName
        }
      },

      /**
       * Association with keys
       *
       * @example
       * entity Notes {
       *   supplier: Association to Suppliers;
       * }
       *
       * -->
       *
       * { association: keys: [ {
       *     $generatedFieldName: 'supplier_ID',
       *     ref: [ 'ID' ]
       *   } ]
       * }
       *
       * @param {*} entity
       * @param {*} association
       * @returns
       */
      associationKeys(entity, association) {
        const keyLength = association.keys && association.keys.length || 0;
        if (keyLength === 0) return;

        const keyMapping = {};
        for (const key of association.keys) {
          const source = key["$generatedFieldName"] || this.throwError(entity, association, "Missing $generatedFieldName");
          const target = key.ref[0] || this.throwError(entity, association, "Missing key ref");
          keyMapping[source] = target;
        }

        return keyMapping;
    },

    isMixedNavigation(req) {
      if (req.query.SELECT.from.ref.length > 1) {
        const requestTargetEntity = req.target.name;
        const selectFromEntity = req.query.SELECT.from.ref[0].id;
        return (requestTargetEntity !== selectFromEntity && this.targetServiceOfEntity(requestTargetEntity) !== this.targetServiceOfEntity(selectFromEntity));
      } else {
        return false;
      }
    },

    navigation(query) {
        const select = query.SELECT;
        if (select.from.ref.length !== 2) {
            throw new Error(
                `Unsupported navigation query with different than 2 entities in FROM clause.`
            );
        }

        const entityName = select.from.ref[0].id || this.throwError(`Missing source entity name for navigation`);
        const entity = util.getEntity(entityName);
        const associationName = select.from.ref[1] || this.throwError(`Missing association name for navigation`);

        return { entityName, entity, associationName };
    },

    missingColumns(columns, requiredColumns) {
      const missingColumns = requiredColumns;

      for (const column of columns) {
        if (column === '*') return []
        if (column.ref) {
          const index = requiredColumns.indexOf(column.ref[0]);
          if (index >= 0) requiredColumns.splice(index, 1);
        }
      }

      return missingColumns;
    },

    whereForFields(entries, fieldMapping) {
      const fields = Object.keys(fieldMapping);
      if (fields.length === 0) throw new Error(`Missing field mappings`);
      if (fields.length === 1) {
        return { [fieldMapping[fields[0]]]: entries.map( entry => entry[fields[0]] ) }
      } else {
        const where = [];
        for (const entry of entries) {
          if (where.length > 0) where.push('or');
          const whereEntry = [];
          where.push(whereEntry);
          for (const name of fields) {
            if (whereEntry.length > 0) whereEntry.push('and');
            whereEntry.push({xpr: [{ref: [fieldMapping[name]]}, '=', {val: entry[name]} ]});
          }
        }

        return where.length > 0 ? where : where[0];
      }
    }
}

module.exports = util;