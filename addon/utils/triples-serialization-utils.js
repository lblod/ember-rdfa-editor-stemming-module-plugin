import { A } from '@ember/array';
import EmberObject from '@ember/object';
import { warn } from '@ember/debug';
import uuid from 'uuid/v4';

const constructResource = async function constructResource(metaModelService, subjectUri, triples, type = null, camelCaseProperties = false){
  let resource = EmberObject.create({ _meta: EmberObject.create() });
  if(!type)
    type = (triples.find(t => t.predicate == 'a' && t.subject == subjectUri) || {}).object;

  if(!type){
    warn(`No type found for ${subjectUri}`, {id: 'triples-serialization-utils.constructResource'});
    return resource;
  }

  //TODO: what if nothing found
  let metaDataType = await metaModelService.getMetaModelForType(type);
  resource.set('uri', subjectUri);
  resource._meta.set('class', metaDataType);
  let metaProps = await metaModelService.getPropertiesFromType(type);
  await Promise.all(metaProps.map(async p => {
    let propLabel = camelCaseProperties ? toCamelCase(p.label) : p.label;
    resource._meta.set(propLabel, p);
    resource.set(propLabel, await constructDataFromProperty(metaModelService, p, subjectUri, triples));
  }));

  return resource;
};

const createEmptyResource = async function createEmptyResource(metaModelService, type, camelCaseProperties = false){
  let resource = EmberObject.create({ _meta: EmberObject.create() });
  let metaDataType = await metaModelService.getMetaModelForType(type);
  if(!metaDataType){
    warn(`No type found for ${type}`, {id: 'triples-serialization-utils.createEmptyResource'});
    return null;
  }

  resource.set('uri', metaDataType.baseUri.replace(/\/+$/, "") + '/' +  uuid());
  resource._meta.set('class', metaDataType);
  let metaProps = await metaModelService.getPropertiesFromType(type);
  metaProps.forEach(p => {
    let propLabel = camelCaseProperties ? toCamelCase(p.label) : p.label;
    resource._meta.set(propLabel, p);
    resource.set(propLabel, null);
  });
  return resource;
};

const toCamelCase= function toCamelCase(property){
  let tokens = property.split('-');
  let newString = tokens[0];
  tokens.slice(1).forEach(t => {
    newString += t.replace(/^./, str => str.toUpperCase());
  });
  return newString;
};

const constructDataFromProperty = async function constructDataFromProperty(metaModelService, metaProperty, subjectUri, triples, camelCaseProperties = false){
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
                                                                                          await metaProperty.get('range.rdfaType'),
                                                                                          camelCaseProperties)));
  return A(resources);
};

export {
  constructResource,
  createEmptyResource
}
