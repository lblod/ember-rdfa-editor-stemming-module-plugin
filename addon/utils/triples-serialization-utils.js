import { A } from '@ember/array';
import EmberObject from '@ember/object';

const constructResource = async function constructResource(metaModelService, subjectUri, triples, type = null){
  let resource = EmberObject.create({ _meta: EmberObject.create() });
  if(!type)
    type = (triples.find(t => t.predicate == 'a' && t.subject == subjectUri) || {}).object;

  if(!type){
    console.log(`No type found for ${subjectUri}`);
    return null;
  }

  //TODO: what if nothing found
  let metaDataType = await metaModelService.getMetamodelForType(type);
  resource.set('uri', subjectUri);
  resource._meta.set('class', metaDataType);
  let metaProps = await metaModelService.getPropertiesFromType(type);
  await Promise.all(metaProps.map(async p => {
    resource._meta.set(p.label, p);
    resource.set(p.label, await constructDataFromProperty(metaModelService, p, subjectUri, triples));
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

  //TODO: some weird stuff where context scanner generates double subject uri's
  relationUris  = A(Array.from(new Set(relationUris)));

  let resources = await Promise.all(relationUris.map(async uri => await constructResource(metaModelService,
                                                                                          uri,
                                                                                          triples,
                                                                                          await metaProperty.get('range.rdfaType'))));
  return A(resources);
};

export {
  constructResource
}
