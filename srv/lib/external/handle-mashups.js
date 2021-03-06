const { asArray, throwAssocError } = require('./util');
const util = require('./util');

class MashupHandler {
  constructor(service) {
    this.service = service;
  }

  getTargetServiceNames(definition) {
    const serviceNames = [];
    const entityTargetServiceName = util.targetServiceNameOfEntity(definition.name);
    if (entityTargetServiceName) {
      serviceNames.push(entityTargetServiceName);
    }
    if (definition.associations) {
      for (const associationName in definition.associations) {
        const association = definition.associations[associationName];
        if (association.type === 'cds.Association') {
          const associationTargetServiceName = util.targetServiceNameOfEntity(association.target);
          if (associationTargetServiceName && !serviceNames.includes(associationTargetServiceName)) {
            serviceNames.push(associationTargetServiceName);
          }
        }
      }
    }
    return serviceNames;
  }

  async init(definition) {
    const serviceNames = this.getTargetServiceNames(definition);
    for (const serviceName of serviceNames) {
      if (!cds.services[serviceName]) {
        try {
          console.info('[lcap] Connect to remote service: ' + serviceName);
          await cds.connect.to(serviceName);
        } catch (error) {
          console.error(error.message);
          return false;
        }
      }
    }
    return true;
  }

  async handle(req, next) {
    let doRequest;

    if (util.isMixedNavigation(req)) {
      doRequest = () => this.resolveNavigation(req, next);
    } else {
      doRequest = this.hasTargetService(req.target.name) ? () => util.targetServiceOfEntity(req.target.name).run(req.query) : next;
    }

    return this.resolveExpands(req, doRequest);
  }

  /**
   * Expand "to one" associations with a single key field
   *
   * @param {*} req
   * @param {*} next
   * @param {*} associationName
   * @param {*} targetService
   * @param {*} headers
   * @returns
   */
  async mixinExpand(req, result, expand) {
    const associationName = expand.ref[0];

    // Get association target
    const {keyMapping, target, is2many, is2one} =
      util.association(req.target, associationName);

    // Take over columns from original query
    const expandColumns = [ ...expand.expand ];
    const missingColumns = util.missingColumns(expandColumns, Object.values(keyMapping));
    for (const column of missingColumns) {
      expandColumns.push({ref: [ column ] });
    }

    const targetService = util.targetServiceOfEntity(target.name);
    if (!targetService) {
      console.error('[lcap] Failed to find target service from the entity: ' + target.name);
      return;
    }

    // Select target
    // REVISIT: const targetResult = await targetService.read(target.name).where({ [targetKeyFieldName]: ids }).columns(expandColumns);
    const targetKeys = Object.values(keyMapping)
    const targetQuery = SELECT.from(target.name)
      .where( util.whereForFields(asArray(result), keyMapping) )
      .columns(expandColumns);
    const targetResult = await targetService.run(targetQuery);

    let targetResultMap;
    if (is2one) {
        targetResultMap = this.mixinExpandTo1(targetResult, targetKeys);
    } else if (is2many) {
        targetResultMap = this.mixinExpandToMany(targetResult, targetKeys);
    } else {
      throwAssocError(req.target, associationName, `Unsupported cardinality.`);
    }

    const keys = Object.keys(keyMapping);
    for (const entry of asArray(result)) {
      const key = this.keyValue(entry, keys);
      const targetEntry = targetResultMap[key];
      if (targetEntry) entry[associationName] = targetEntry;
    }
  }

  mixinExpandTo1(targetResult, targetFieldNames) {
    const targetResultMap = {};
    for (const targetEntry of targetResult) {
      targetResultMap[this.keyValue(targetEntry, targetFieldNames)] = targetEntry;
    }

    return targetResultMap;
  }

  keyValue(entry, fieldNames) {
    if (fieldNames.length === 1)
      return entry[fieldNames];
    else
      return fieldNames.map( key => encodeURIComponent(entry[key]) ).join("&");
  }

  mixinExpandToMany(targetResult, targetFieldNames) {
    const targetResultMap = {};
    for (const targetEntry of targetResult) {
      const key = this.keyValue(targetEntry, targetFieldNames);

      if (!targetResultMap[key]) targetResultMap[key] = [];
      targetResultMap[key].push(targetEntry);
    }

    return targetResultMap;
  }

  /**
   * @example
   * Notes(24B58115-E394-423B-BEAB-53419A32B927)/supplier
   *
   * -->
   * { SELECT: { from: { ref: {[
   *   [ id: 'NotesService.Notes',
   *     where: [
   *       ref: [ 'ID' ],
   *       '=',
   *       val: ''545A3CF9-84CF-46C8-93DC-E29F0F2BC6BE'
   *      ],
   *   ],
   *   [ 'supplier' ]
   * ]}}}
   *
   *
   * @param {*} req
   * @param {*} next
   * @returns
   */
  async resolveNavigation(req, next) {
    const select = req.query.SELECT;
    const {entityName, entity, associationName} = util.navigation(req.query);
    const {keyMapping, target, is2many, is2one} = util.association(entity, associationName);

    const sourceService = util.targetServiceOfEntity(entityName);
    const targetService = util.targetServiceOfEntity(target.name);

    if (sourceService === targetService) return await next();

    // REVISIT: How to call service datasource w/o handlers
    const selectEntry = SELECT.one(Object.keys(keyMapping))
      .from(entityName)
      .where(select.from.ref[0].where);
    const entry = await sourceService.run(selectEntry);

    // REVISIT: How to call service datasource w/o handlers
    // REVISIT: const result = await targetService.read(target).columns(req.query.SELECT.columns).where({ [targetKeyFieldName]: entry[keyFieldName] });
    // TODO: req.query.clone() -> to overwrite / extend from etc.
    const selectTarget = SELECT(select.columns || "*")
      .from(target)
      .where(util.whereForFields([ entry ], keyMapping));
    const result = await targetService.run(selectTarget);
    if (is2many) {
      return result;
    } else if (is2one) {
      return result && result[0];
    } else {
      throw new Error('Unsupported association cardinality');
    }
}

  async resolveExpands(req, next) {
    const select = req.query.SELECT;
    const expandFilter = (column) => {
      if (!column.expand) return false;
      const associationName = column.ref[0];

      return this.hasDifferentTargetServices(req.target.name, req.target.associations[associationName].target);
    };

    // No columns --> no expands
    if (!select.columns) return next();

    const expands = select.columns.filter(expandFilter);
    if (expands.length === 0) return next();

    let allMissingKeyColumns = [];
    select.columns = select.columns.filter((column) => !expandFilter(column));
    for (const expand of expands) {
      const associationName = expand.ref[0];
      const {keyMapping} = util.association(req.target, associationName);

      // Make sure key columns are contained in select
      const missingKeyColumns = util.missingColumns(select.columns, Object.keys(keyMapping));
      for (const name of missingKeyColumns) {
        select.columns.push({ ref: name });
      }
      allMissingKeyColumns = allMissingKeyColumns.concat(missingKeyColumns);
    }

    // Call service implementation
    const result = await next();

    await Promise.all(
      expands.map((expand) => this.mixinExpand(req, result, expand))
    );

    // Clean-up columns added for select
    if (allMissingKeyColumns.length > 0) {
      for (const entry of result) {
        for (const name of allMissingKeyColumns)
          delete entry[name];
      }
    }

    return result;
  }


  hasTargetService(entityName) {
    return !!util.targetServiceNameOfEntity(entityName);
  }

  hasDifferentTargetServices(entityNameA, entityNameB) {
    return util.targetServiceOfEntity(entityNameA) !== util.targetServiceOfEntity(entityNameB);
  }
}

module.exports = MashupHandler;