const emberModelToGenericModel = async function emberModelToGenericModel(serializationUtils, metaModelQuery, emberModelInstance, relationsToLoad) {
  let metaModel = await metaModelQuery.getMetaModelForLabel(emberModelInstance.get('constructor.modelName'));
  let genericModelInstance = await serializationUtils.createEmptyResource(metaModel.rdfaType, true);
  genericModelInstance.uri = emberModelInstance.uri;
  updateAttributes(genericModelInstance, emberModelInstance);
  for(let relLoad of relationsToLoad){
    await updateRelation(serializationUtils, metaModelQuery, genericModelInstance,  emberModelInstance, relLoad);
  }
  return genericModelInstance;
};

const updateAttributes = function updateAttributes(genericModelInstance, emberModelInstance){
  let attributes = [];
  emberModelInstance.get('constructor.fields').forEach((k, v) => { if(v == 'attribute') attributes.push(k); } );
  attributes.forEach(a => { genericModelInstance.set(a, emberModelInstance.get(a)); });
};

const updateRelation = async function updateRelation(serializationUtils, metaModelQuery, genericModelInstance, emberModelInstance, relationPathStr){
  if(!relationPathStr)
    return genericModelInstance;
  let relationsPathArray = relationPathStr.split('.');
  let prop = relationsPathArray[0];
  let fetchedRelation = await emberModelInstance.get(prop);
  let fieldType = emberModelInstance.get('constructor.fields').get(prop);
  if(fieldType == 'hasMany'){
    for(let relation of fetchedRelation.toArray()){
      let genericModelRel = await emberModelToGenericModel(serializationUtils , metaModelQuery, relation, [ relationsPathArray.slice(1).join('.') ]);
      genericModelInstance.get(prop).pushObject(genericModelRel);
    }
  }
  else {
    let genericModelRel = await emberModelToGenericModel(serializationUtils, metaModelQuery, fetchedRelation, [ relationsPathArray.slice(1).join('.') ]);
    genericModelInstance.get(prop).pushObject(genericModelRel);
  }
  return genericModelInstance;
};

export default emberModelToGenericModel;
