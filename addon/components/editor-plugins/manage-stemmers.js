import Component from '@ember/component';
import layout from '../../templates/components/editor-plugins/manage-stemmers';
import { computed } from '@ember/object';
import { inject as service } from '@ember/service';
import { A } from '@ember/array';
import { task } from 'ember-concurrency';
import RdfaContextScanner from '@lblod/ember-rdfa-editor/utils/rdfa-context-scanner';

export default Component.extend({
  layout,
  metaModelQuery: service(),
  tripleSerialization: service('triplesSerializationUtils'),

  //TODO: apply business rules which orgaan which mandataris is allowed
  //TODO: performance -> make sure context scanner runs only once

  getAllTriplesBehandelingenVanAgendapuntUntilCurrent(){
    let propertyToQuery = 'besluit:BehandelingVanAgendapunt'; //TODO: this is naive take also uri's into account
    //Assumes array is ordened see https://www.w3.org/TR/selectors-api/#queryselectorall
    let nodes = this.editorRootNode.querySelectorAll(`[typeof="${propertyToQuery}"]`);
    let behandelingenVanAgendapunt = [];

    //get all behandelingenVanAgendapunt until the current one;
    for(let node of nodes){
      if(this.domNodeBehandelingAP.isSameNode(node)){
        behandelingenVanAgendapunt.push(node);
        break;
      }
      behandelingenVanAgendapunt.push(node);
    }

    let allTriplesSoFar = [];
    behandelingenVanAgendapunt.forEach(n => allTriplesSoFar = [...allTriplesSoFar, ...this.serializeDomToTriples(n)] );
    return allTriplesSoFar;
  },

  async personenInAgendapunt(){
    let metaModelP = await this.metaModelQuery.getMetaModelForLabel("Persoon");
    return this.tripleSerialization.getAllResourcesForType(metaModelP.rdfaType, this.serializeDomToTriples(this.domNodeBehandelingAP), true);
  },

  serializeDomToTriples(domNode){
    const contextScanner = RdfaContextScanner.create({});
    const contexts = contextScanner.analyse(domNode).map((c) => c.context);
    if(contexts.length == 0)
      return [];
    return Array.concat(...contexts);
  },

  async findMandatarissenInDocument(triples){
    let metaModelM = await this.metaModelQuery.getMetaModelForLabel("Mandataris");
    return this.tripleSerialization.getAllResourcesForType(metaModelM.rdfaType, triples, true);
  },

  findMandatarissen(persoon, mandatarissenInDocument){
    return mandatarissenInDocument.filter(m => m.get('isBestuurlijkeAliasVan.0.uri') == persoon.uri);
  },

  loadData: task(function*(){
    if(this.editMode)
      yield this.loadDataEditMode();
    else
      yield this.loadDataCreateMode();
  }),

  async loadDataCreateMode(){
    let personen = await this.personenInAgendapunt();
    let allTriplesSoFar = this.getAllTriplesBehandelingenVanAgendapuntUntilCurrent();
    let mandatarissen = await this.findMandatarissenInDocument(allTriplesSoFar);
    let mandatarissenAP = [];
    for(let p of personen){
      mandatarissenAP = [...mandatarissenAP, ...this.findMandatarissen(p, mandatarissen)];
    }
    this.set('mandatarissen', A(mandatarissenAP));
  },

  async loadDataEditmode(){
    let mandatarissenAndStem = A();
    let voorstanderProp = await this.metaModelQuery.getPropertiesForLabel('voorstanders').firstObject;
    let tegenstanderProp = await this.metaModelQuery.getPropertiesForLabel('tegenstanders').firstObject;
    let onthouderProp = await this.metaModelQuery.getPropertiesForLabel('onthouders').firstObject;
    this.stemming.voorstanders.forEach(m => mandatarissenAndStem.pushObject({ mandataris: m, stem: voorstanderProp }));
    this.stemming.tegenstanders.forEach(m => mandatarissenAndStem.pushObject({ mandataris: m, stem: tegenstanderProp }));
    this.stemming.onthouders.forEach(m => mandatarissenAndStem.pushObject({ mandataris: m, stem: onthouderProp }));
    this.set('mandatarissenAndStem', mandatarissenAndStem);
  },

  didReceiveAttrs() {
    this._super(...arguments);
    if(!this.domNodeBehandelingAP)
      return;
    this.loadData.perform();
  },

  updateCountStemBehaviour(){
    this.stemming.set('aantalVoorstanders', this.stemming.voorstanders.length);
    this.stemming.set('aantalTegenstanders', this.stemming.tegenstanders.length);
    this.stemming.set('aantalOnthouders', this.stemming.onthouders.length);
  },


  actions: {
    updateStemmer(){
      if(!this.stemming.geheim){
        this.updateCountStemBehaviour();
      }
    },

    removeStemmer(){
      if(!this.stemming.geheim){
        this.updateCountStemBehaviour();
      }
    }
  }

});
