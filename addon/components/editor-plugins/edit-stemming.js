import Component from '@ember/component';
import layout from '../../templates/components/editor-plugins/edit-stemming';
import { computed } from '@ember/object';
import { A } from '@ember/array';
import { inject as service } from '@ember/service';
import { task } from 'ember-concurrency';
import RdfaContextScanner from '@lblod/ember-rdfa-editor/utils/rdfa-context-scanner';

//TODO: simplify properties
export default Component.extend({
  layout,
  store: service(),
  metaModelQuery: service(),
  tripleSerialization: service('triplesSerializationUtils'),
  manageAanwezigen: true,
  manageStemmers: false,

  geheim: computed('stemming.geheim', {
    get(){
      return this.stemming.get('geheim');
    },

    set(k, isGeheim){
      this.stemming.set('geheim', isGeheim);
      return isGeheim;
    }
  }),

  viewModeOpenbaar: computed('stemming.geheim', function(){
    return !(this.stemming.get('geheim') || false);
  }),

  aantalOnthouders: computed('stemming.aantalOnthouders', {
    get(){
      return this.stemming.get('aantalOnthouders') || 0;
    },

    set(k, v){
      this.stemming.set('aantalOnthouders', parseInt(v));
      return v;
    }

  }),

  aantalVoorstanders: computed('stemming.aantalVoorstanders', {
    get(){
      return this.stemming.get('aantalVoorstanders') || 0;
    },

    set(k, v){
      this.stemming.set('aantalVoorstanders', parseInt(v));
      return v;
    }
  }),

  aantalTegenstanders: computed('stemming.aantalTegenstanders', {
    get(){
      return this.stemming.get('aantalTegenstanders') || 0;
    },

    set(k, v){
      this.stemming.set('aantalTegenstanders', parseInt(v));
      return v;
    }
  }),

  gevolg: computed('stemming.gevolg', {
    get(){
      return this.stemming.get('gevolg');
    },

    set(k, v){
      this.stemming.set('gevolg', v);
      return v;
    }
  }),

  onderwerp: computed('stemming.onderwerp', {
    get(){
      return this.stemming.get('onderwerp');
    },

    set(k, v){
      this.stemming.set('onderwerp', v);
      return v;
    }
  }),

  //TODO: apply business rules which orgaan which mandataris is allowed
  //TODO: performance -> make sure context scanner runs only once
  //TODO: adding person should be scoped to the ones having a mandaat within context
  //TODO: check if datatype is done by rdfaContext
  //TODO: strip strings from triple
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
    let triples = this.serializeDomToTriples(this.domNodeBehandelingAP);
    triples.forEach(t => t.object = t.object.trim());
    return this.tripleSerialization.getAllResourcesForType(metaModelP.rdfaType, triples, true);
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

  loadData: task(function*(){
    let personen = yield this.personenInAgendapunt();
    let allTriplesSoFar = this.getAllTriplesBehandelingenVanAgendapuntUntilCurrent();
    allTriplesSoFar.forEach(t => t.object = t.object.trim());
    let mandatarissen = yield this.findMandatarissenInDocument(allTriplesSoFar);
    this.set('mandatarissenInDocument', mandatarissen);
    this.set('personenInDocument', personen);
  }),

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
    manageAanwezigen(){
      this.set('manageAanwezigen', true);
      this.set('manageStemmers', false);
    },

    manageStemmers(){
      this.set('manageAanwezigen', false);
      this.set('manageStemmers', true);
    },
    removeAanwezige(){
      if(!this.stemming.geheim){
        this.updateCountStemBehaviour();
      }
    },

    updateStemmer(){
      if(!this.stemming.geheim){
        this.updateCountStemBehaviour();
      }
    },

    removeStemmer(){
      if(!this.stemming.geheim){
        this.updateCountStemBehaviour();
      }
    },

    save(){
      if(this.stemming.geheim){
        this.stemming.set('voorstanders', A());
        this.stemming.set('tegenstanders', A());
        this.stemming.set('onthouders', A());
      }
      this.onSave(this.stemming);
    },

    cancel(){
      this.onCancel();
    }
  }
});
