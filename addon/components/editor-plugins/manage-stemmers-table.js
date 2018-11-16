import Component from '@ember/component';
import layout from '../../templates/components/editor-plugins/manage-stemmers-table';
import { A } from '@ember/array';
import EmberObject from '@ember/object';
import { task } from 'ember-concurrency';
import { inject as service } from '@ember/service';
import { computed } from '@ember/object';
import { reads } from '@ember/object/computed';

export default Component.extend({
  layout,
  metaModelQuery: service(),
  isSecret: computed('stemming.geheim', function(){
    return this.stemming.get('geheim') == "true" || false;
  }),

  isBusy: computed('loadData.isRunning', function(){
    return this.loadData.isRunning;
  }),

  async setVoteBehaviourTypes(){
    this.set('voorstanderProp', (await this.metaModelQuery.getPropertiesForLabel('voorstanders')).firstObject);
    this.set('tegenstanderProp', (await this.metaModelQuery.getPropertiesForLabel('tegenstanders')).firstObject);
    this.set('onthouderProp', (await this.metaModelQuery.getPropertiesForLabel('onthouders')).firstObject);
  },

  async constructRows(){
    let rows = [];
    for(let mandataris of this.stemming.stemmers){
      let row = await this.createRow(mandataris);
      rows.push(row);
    }
    this.set('rows', A(rows.sort((a,b) => a.persoon.gebruikteVoornaam.trim().localeCompare(b.persoon.gebruikteVoornaam.trim()))));
  },

  async createRow(mandataris){
    let selectedStemBehaviour = this.findStemBehaviour(mandataris);
    return EmberObject.create({persoon: mandataris.isBestuurlijkeAliasVan[0], mandataris, selectedStemBehaviour});
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
    let props = ['voorstanders', 'tegenstanders', 'onthouders'];
    for(let prop of props){
      let mandatarisToDelete = this.stemming.get(prop).find(m => m.uri == mandataris.uri);
      this.stemming.get(prop).removeObject(mandatarisToDelete);
    }
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
    updateStembehaviour(row, stemBehaviour){
      this.flushMandatarisFromStemming(row.mandataris);
      row.set('selectedStemBehaviour', null);
      if(stemBehaviour){
        this.stemming.get(stemBehaviour.label).pushObject(row.mandataris);
        row.set('selectedStemBehaviour', stemBehaviour);
      }
      this.onUpdate();
    }
  }
});
