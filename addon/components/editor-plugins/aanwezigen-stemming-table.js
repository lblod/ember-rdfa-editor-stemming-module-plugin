import Component from '@ember/component';
import layout from '../../templates/components/editor-plugins/aanwezigen-stemming-table';
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

  isBusy: computed('loadData.isRunning', 'updateRowForNewPerson.isRunning', function(){
    return this.loadData.isRunning || this.updateRowForNewPerson.isRunning;
  }),

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
    let persoonUris = this.stemming.aanwezigen.map(m => m.isBestuurlijkeAliasVan[0].uri);
    if(persoonUris.length == 0)
      persoonUris = this.personenInDocument.map(p => p.uri);

    persoonUris = Array.from(new Set(persoonUris));

    let rows = [];

    for(let persoonUri of persoonUris){
      let row = await this.createRow(persoonUri);
      rows.push(row);
    }
    this.set('rows', A(rows.sort((a,b) => a.persoon.gebruikteVoornaam.trim().localeCompare(b.persoon.gebruikteVoornaam.trim()))));
  },

  updateRowForNewPerson: task(function* (persoon){
    let row = yield this.createRow(persoon.uri);
    this.rows.pushObject(row);
    this.set('initAddPersoon', false);
    this.set('rows', this.rows.sort((a,b) => a.persoon.gebruikteVoornaam.trim().localeCompare(b.persoon.gebruikteVoornaam.trim())));
  }),

  async createRow(persoonUri){
    let mandatarissen = await this.findMandatarissen(persoonUri);
    let selectedMandataris = this.stemming.aanwezigen.find(m => m.isBestuurlijkeAliasVan[0].uri == persoonUri);

    //set a default one
    if(!selectedMandataris){
      selectedMandataris = mandatarissen[0];
      this.stemming.aanwezigen.pushObject(selectedMandataris);
    }

    let isAanwezigeStemmer = this.stemming.stemmers.find(m => selectedMandataris.uri == m.uri) ? true : false;

    return EmberObject.create({persoon: mandatarissen[0].isBestuurlijkeAliasVan[0], mandatarissen, selectedMandataris, isAanwezigeStemmer});
  },

  flushMandatarisFromStemming(mandataris, props = ['voorstanders', 'tegenstanders', 'onthouders', 'stemmers', 'aanwezigen']){
    //Objects might change reference, so we need to remove on uri
    for(let prop of props){
      let mandatarisToDelete = this.stemming.get(prop).find(m => m.uri == mandataris.uri);
      this.stemming.get(prop).removeObject(mandatarisToDelete);
    }
  },

  updateMandatrisFromStemming(oldMandataris, newMandataris){
    //Objects might change reference, so we need to remove on uri
    let props = ['voorstanders', 'tegenstanders', 'onthouders', 'stemmers', 'aanwezigen'];
    for(let prop of props){
      let mandatarisToDelete = this.stemming.get(prop).find(m => m.uri == oldMandataris.uri);
      if(mandatarisToDelete){
        this.stemming.get(prop).removeObject(mandatarisToDelete);
        this.stemming.get(prop).pushObject(newMandataris);
      }
    }
  },

  loadData: task(function*(){
    yield this.constructRows();
  }),

  didReceiveAttrs() {
    this._super(...arguments);
    if(!this.mandatarissenInDocument)
      return;
    if(!this.personenInDocument)
      return;
    this.loadData.perform();
  },

  actions: {

    updateMandatarisAanwezige(row, mandataris){
      this.updateMandatrisFromStemming(row.selectedMandataris, mandataris);
      row.set('selectedMandataris', mandataris);
    },

    addStemmer(row){
      this.stemming.stemmers.pushObject(row.selectedMandataris);
      row.set('isAanwezigeStemmer', true);
    },

    removeStemmer(row){
      this.flushMandatarisFromStemming(row.selectedMandataris, ['voorstanders', 'tegenstanders', 'onthouders', 'stemmers']);
      row.set('isAanwezigeStemmer', false);
      this.onRemoveStemmer();
    },

    removeAanwezige(row){
      this.flushMandatarisFromStemming(row.selectedMandataris);
      this.rows.removeObject(row);
      this.onRemoveAanwezige();
    },

    initAddPersoon(){
      this.set('initAddPersoon', true);
    },

    cancelAddPersoon(){
      this.set('initAddPersoon', false);
    },

    saveNewPersoon(persoon){
      this.updateRowForNewPerson.perform(persoon);
    }

  }

});
