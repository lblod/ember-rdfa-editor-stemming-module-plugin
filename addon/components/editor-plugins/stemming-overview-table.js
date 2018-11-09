import Component from '@ember/component';
import layout from '../../templates/components/editor-plugins/stemming-overview-table';
import { createEmptyResource } from '../../utils/triples-serialization-utils';
import { inject as service } from '@ember/service';
import { task } from 'ember-concurrency';
import { computed } from '@ember/object';

export default Component.extend({
  layout,
  metaModelQuery: service(),

  editMode: computed('edit', 'create', {
    get(){
      return this.edit || this.create;
    },
    set(k, v){
      if(!v){
        this.set('edit', false);
        this.set('create', false);
      }
      return v;
    }
  }),

  createNewStemming: task(function*(){
    let typeUri = (yield this.metaModelQuery.getMetaModelForLabel('stemming')).get('rdfaType');
    let emptyStemming = yield createEmptyResource(this.metaModelQuery, typeUri, true);
    this.set('editStemming', emptyStemming);
    this.set('create', true);
  }),

  actions: {

    add(){
      this.createNewStemming.perform();
    },

    cancel(){
      this.set('editMode', false);
      this.set('editStemming', null);
    },

    create(stemming){
      this.stemmingen.pushObject(stemming);
      this.set('editStemming', null);
      this.set('editMode', false);
    },

    save(){
      this.set('editStemming', null);
      this.set('editMode', false);
    },

    edit(stemming){
      this.set('editStemming', stemming);
      this.set('edit', true);
    },

    remove(stemming){
      this.stemmingen.removeObject(stemming);
    }
  }
});
