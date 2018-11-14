import Component from '@ember/component';
import layout from '../../templates/components/editor-plugins/manage-stemmers-table';
import { A } from '@ember/array';
import EmberObject from '@ember/object';
import { task } from 'ember-concurrency';
import { inject as service } from '@ember/service';
import { reads } from '@ember/object/computed';

export default Component.extend({
  layout,
  metaModelQuery: service(),

  isSecret: reads('stemming.geheim'),

  async setVoteBehaviourTypes(){
    this.set('voorstanderProp', (await this.metaModelQuery.getPropertiesForLabel('voorstanders')).firstObject);
    this.set('tegenstanderProp', (await this.metaModelQuery.getPropertiesForLabel('tegenstanders')).firstObject);
    this.set('onthouderProp', (await this.metaModelQuery.getPropertiesForLabel('onthouders')).firstObject);
  },

  constructRows(){
    //TODO: cleanup to generic groupBy
    let persoonUris = this.stemming.stemmers.map(m => m.isBestuurlijkeAliasVan[0].uri);
    if(persoonUris.length == 0)
      persoonUris = this.mandatarissen.map(m => m.isBestuurlijkeAliasVan[0].uri);

    persoonUris = Array.from(new Set(persoonUris));

    let rows = [];

    //for ease of code: flush the stemmers and reconstruct them
    let updatedStemmers = A();

    for(let persoonUri of persoonUris){
      let mandatarissen = this.mandatarissen.filter( m => m.isBestuurlijkeAliasVan[0].uri == persoonUri );
      let selectedMandataris = mandatarissen.find(this.findStemBehaviour.bind(this));

      //set a default one
      if(!selectedMandataris){
        let mandatarisAlsStemmer = this.stemming.stemmers.find(m => m.isBestuurlijkeAliasVan[0].uri == persoonUri);
        selectedMandataris =mandatarisAlsStemmer ||  mandatarissen[0];
      }

      updatedStemmers.pushObject(selectedMandataris);

      let selectedStemBehaviour = this.findStemBehaviour(selectedMandataris);

      rows.push(EmberObject.create({persoon: mandatarissen[0].isBestuurlijkeAliasVan[0], mandatarissen, selectedMandataris, selectedStemBehaviour}));
    }
    this.stemming.set('stemmers', updatedStemmers);
    this.set('rows', A(rows));
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
    this.constructRows();
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

    addStemmer(){

    }
  }
});
