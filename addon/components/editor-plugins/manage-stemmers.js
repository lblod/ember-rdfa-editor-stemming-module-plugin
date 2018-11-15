import Component from '@ember/component';
import layout from '../../templates/components/editor-plugins/manage-stemmers';
import { computed } from '@ember/object';
import { inject as service } from '@ember/service';
import { A } from '@ember/array';
import { task } from 'ember-concurrency';
import RdfaContextScanner from '@lblod/ember-rdfa-editor/utils/rdfa-context-scanner';
import emberModelToGenericModel from '../../utils/ember-model-to-generic-model';

export default Component.extend({
  layout,
  store: service(),
  metaModelQuery: service(),
  tripleSerialization: service('triplesSerializationUtils'),

  //TODO: apply business rules which orgaan which mandataris is allowed
  //TODO: performance -> make sure context scanner runs only once
  //TODO: get mandatarissen from backend too

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

  async findMandatarissen(persoon, mandatarissenInDocument){
    let mandatarissen = mandatarissenInDocument.filter(m => m.get('isBestuurlijkeAliasVan.0.uri') == persoon.uri);
    let mandatarissenBackend = await this.store.query('mandataris', {
      'filter[is-bestuurlijke-alias-van][:uri:]': persoon.uri,
      'filter[bekleedt][bevat-in][:uri:]': this.bestuursorgaan.uri
    });
    for(let mandataris of mandatarissenBackend.toArray()){
      let m = await emberModelToGenericModel(this.tripleSerialization,
                                             this.metaModelQuery,
                                             mandataris,
                                             ['bekleedt.bestuursfunctie', 'isBestuurlijkeAliasVan']);
      mandatarissen.push(m);
    }
    return mandatarissen;
  },

  loadData: task(function*(){
    yield this.loadDataCreateMode();
  }),

  async loadDataCreateMode(){
    let personen = await this.personenInAgendapunt();
    let allTriplesSoFar = this.getAllTriplesBehandelingenVanAgendapuntUntilCurrent();
    let mandatarissen = await this.findMandatarissenInDocument(allTriplesSoFar);
    let mandatarissenAP = [];
    for(let p of personen){
      mandatarissenAP = [...mandatarissenAP, ...(await this.findMandatarissen(p, mandatarissen))];
    }
    this.set('mandatarissen', A(mandatarissenAP));
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
