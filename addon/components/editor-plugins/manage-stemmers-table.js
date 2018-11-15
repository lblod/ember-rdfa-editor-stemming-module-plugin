import Component from '@ember/component';
import layout from '../../templates/components/editor-plugins/manage-stemmers-table';
import { A } from '@ember/array';
import EmberObject from '@ember/object';
import { task } from 'ember-concurrency';
import { inject as service } from '@ember/service';
import { computed } from '@ember/object';
import { reads } from '@ember/object/computed';
import emberModelToGenericModel from '../../utils/ember-model-to-generic-model';

export default Component.extend({
  layout,
  metaModelQuery: service(),
  store: service(),
  isSecret: reads('stemming.geheim'),

  isBusy: computed('loadData.isRunning', 'updateRowForNewPerson.isRunning', function(){
    return this.loadData.isRunning || this.updateRowForNewPerson.isRunning;
  }),

  async setVoteBehaviourTypes(){
    this.set('voorstanderProp', (await this.metaModelQuery.getPropertiesForLabel('voorstanders')).firstObject);
    this.set('tegenstanderProp', (await this.metaModelQuery.getPropertiesForLabel('tegenstanders')).firstObject);
    this.set('onthouderProp', (await this.metaModelQuery.getPropertiesForLabel('onthouders')).firstObject);
  },

  async findMandatarissen(persoonUri){
    let mandatarissen = this.mandatarissenInDocument.filter(m => m.get('isBestuurlijkeAliasVan.0.uri') == persoonUri);
    let mandatarissenBackend = await this.store.query('mandataris', {
      'filter[is-bestuurlijke-alias-van][:uri:]': persoonUri,
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

  async constructRows(){
    //TODO: cleanup to generic groupBy
    let persoonUris = this.stemming.stemmers.map(m => m.isBestuurlijkeAliasVan[0].uri);
    if(persoonUris.length == 0)
      persoonUris = this.personenInDocument.map(p => p.uri);

    persoonUris = Array.from(new Set(persoonUris));

    let rows = [];

    //for ease of code: flush the stemmers and reconstruct them
    let updatedStemmers = A();

    for(let persoonUri of persoonUris){
      let row = await this.createRow(persoonUri);
      updatedStemmers.pushObject(row.selectedMandataris);
      rows.push(row);
    }
    this.stemming.set('stemmers', updatedStemmers);
    this.set('rows', A(rows.sort((a,b) => a.persoon.gebruikteVoornaam.trim().localeCompare(b.persoon.gebruikteVoornaam.trim()))));
  },

  updateRowForNewPerson: task(function* (persoon){
    let row = yield this.createRow(persoon.uri);
    this.stemming.stemmers.pushObject(row.selectedMandataris);
    this.rows.pushObject(row);
    this.set('addStemmerMode', false);
    this.set('rows', this.rows.sort((a,b) => a.persoon.gebruikteVoornaam.trim().localeCompare(b.persoon.gebruikteVoornaam.trim())));
  }),

  async createRow(persoonUri){
    let mandatarissen = await this.findMandatarissen(persoonUri);
    let selectedMandataris = mandatarissen.find(this.findStemBehaviour.bind(this));

    //set a default one
    if(!selectedMandataris){
      let mandatarisAlsStemmer = this.stemming.stemmers.find(m => m.isBestuurlijkeAliasVan[0].uri == persoonUri);
      selectedMandataris =mandatarisAlsStemmer ||  mandatarissen[0];
    }
    let selectedStemBehaviour = this.findStemBehaviour(selectedMandataris);
    return EmberObject.create({persoon: mandatarissen[0].isBestuurlijkeAliasVan[0], mandatarissen, selectedMandataris, selectedStemBehaviour});
  },

  findStemBehaviour(mandataris){
    if(this.stemming.voorstanders.find(m => m.uri == mandataris.uri))
      return this.voorstanderProp;

    if(this.stemming.tegenstanders.find(m => m.uri == mandataris.uri))
      return this.tegenstanderProp;

    if(this.stemming.onthouders.find(m => m.uri == mandataris.uri))
      return this.onthouderProp;

    return null;
  },

  flushMandatarisFromStemming(mandataris){
    //Objects might change reference, so we need to remove on uri
    let props = ['voorstanders', 'tegenstanders', 'onthouders', 'stemmers'];
    for(let prop of props){
      let mandatarisToDelete = this.stemming.get(prop).find(m => m.uri == mandataris.uri);
      this.stemming.get(prop).removeObject(mandatarisToDelete);
    }
  },

  updateStemmer(stemBehaviour, mandataris){
    if(mandataris)
      this.stemming.stemmers.pushObject(mandataris);
    if(stemBehaviour)
      this.stemming.get(stemBehaviour.label).pushObject(mandataris);
  },

  loadData: task(function*(){
    yield this.setVoteBehaviourTypes();
    yield this.constructRows();
  }),

  didReceiveAttrs() {
    this._super(...arguments);
    this.loadData.perform();
  },

  actions: {

    updateMandataris(row, mandataris){
      this.flushMandatarisFromStemming(row.selectedMandataris);
      this.updateStemmer(row.selectedStemBehaviour, mandataris);
      if(mandataris)
        row.set('selectedMandataris', mandataris);
      this.onUpdate();
    },

    updateStembehaviour(row, stemBehaviour){
      this.flushMandatarisFromStemming(row.selectedMandataris);
      this.updateStemmer(stemBehaviour, row.selectedMandataris);
      if(stemBehaviour)
        row.set('selectedStemBehaviour', stemBehaviour);
      this.onUpdate();
    },

    deleteRow(row){
      this.flushMandatarisFromStemming(row.selectedMandataris);
      this.rows.removeObject(row);
      this.onRemove();
    },

    initAddStemmer(){
      this.set('addStemmerMode', true);
    },

    cancelAddStemmer(){
      this.set('addStemmerMode', false);
    },

    saveNewPersoon(persoon){
      this.updateRowForNewPerson.perform(persoon);
    }
  }
});
