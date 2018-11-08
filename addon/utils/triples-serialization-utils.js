//TODO: weird mix vanilla objects and ember model...
const constructResource = async function constructResource(metaModelService, subjectUri, triples){
  let resource = {};
  let type = (triples.find(t => t.predicate == 'a' && t.subject == subjectUri) || {}).object;

  if(!type){
    console.log(`No type found for ${subjectUri}`);
    return null;
  }

  //TODO: fix ember model mix
  let metaDataType = await metaModelService.getMetamodelForType(type);
  resource['data'] = { uri: subjectUri };
  resource['meta'] = { class : metaDataType };
  let metaProps = await metaModelService.getPropertiesFromType(type);
  resource['meta']['properties'] = metaProps.toArray();

  await Promise.all(metaProps.map(async p => {
    resource.data[p.label] = await constructDataFromProperty(metaModelService, p, subjectUri, triples);
  }));

  return resource;
};

const constructDataFromProperty = async function constructDataFromProperty(metaModelService, metaProperty, subjectUri, triples){
  if(await metaProperty.get('range.isPrimitive')){
    //we the last occurence of the triple is considered the correct value
    let triple = triples.slice(0).reverse().find(t => t.predicate == metaProperty.rdfaType && t.subject == subjectUri);
    return triple ? triple.object : null;
  }

  //can be many so take all occurences
  let relationUris = (triples
                           .filter(t => t.predicate == metaProperty.rdfaType && t.subject == subjectUri) || [])
                           .map( t => t.object) ; //we assume these are URI's!!!

  //TODO: some weird stuff where context scanner generates doubles
  relationUris = [...(new Set(relationUris))];
  
  let resources = await Promise.all(relationUris.map(async uri => await constructResource(metaModelService, uri, triples)));
  return resources;
};

export {
  constructResource
}