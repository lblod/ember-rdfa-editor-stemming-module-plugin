import { computed } from '@ember/object';
import { reads } from '@ember/object/computed';
import Component from '@ember/component';
import layout from '../../templates/components/editor-plugins/stemming-module-card';
import { inject as service } from '@ember/service';
import { task } from 'ember-concurrency';

/**
* Card displaying a hint of the Date plugin
*
* @module editor-stemming-module-plugin
* @class StemmingModuleCard
* @extends Ember.Component
*/
export default Component.extend({
  layout,
  expandedExt: 'http://mu.semte.ch/vocabularies/ext/',
  outputId: computed('id', function() {
    return `output-stemming-table-${this.elementId}`;
  }),
  store: service(),
  rdfaEditorStemmingModulePlugin: service(),
  /**
   * Region on which the card applies
   * @property location
   * @type [number,number]
   * @private
  */
  location: reads('info.location'),

  /**
   * Unique identifier of the event in the hints registry
   * @property hrId
   * @type Object
   * @private
  */
  hrId: reads('info.hrId'),

  /**
   * The RDFa editor instance
   * @property editor
   * @type RdfaEditor
   * @private
  */
  editor: reads('info.editor'),

  /**
   * Hints registry storing the cards
   * @property hintsRegistry
   * @type HintsRegistry
   * @private
  */
  hintsRegistry: reads('info.hintsRegistry'),

  bestuursorgaanUri: reads('rdfaEditorStemmingModulePlugin.bestuursorgaanUri'),

  disabledButtons: false,

  async setProperties() {
    let bestuurseenheid = ( await this.store.query('bestuurseenheid',
                                           { 'filter[bestuursorganen][heeft-tijdsspecialisaties][:uri:]': this.bestuursorgaanUri }
                                                 )).firstObject;
    this.set('bestuurseenheid', bestuurseenheid);

    let bestuursorgaan = (await this.store.query('bestuursorgaan',
                                                  { 'filter[:uri:]': this.bestuursorgaanUri }
                                                )).firstObject;
    this.set('bestuursorgaan', bestuursorgaan);
  },

  createWrappingHTML(innerHTML){
    return `<div property="ext:stemmingTable">
              <span class="u-hidden">${new Date().toISOString()}</span>
                ${innerHTML}
              <span class="u-hidden">${new Date().toISOString() + 1}</span>
            </div>`;
  },

  loadData: task(function *(){
    yield this.setProperties();
  }),

  didReceiveAttrs() {
    this._super(...arguments);
    if(this.bestuursorgaanUri)
      this.loadData.perform();
  },

  actions: {
    insert(){
      const html = this.createWrappingHTML(document.getElementById(this.outputId).innerHTML);
      this.hintsRegistry.removeHintsAtLocation(this.location, this.hrId, this.info.who);
      this.location = this.hintsRegistry.updateLocationToCurrentIndex(this.hrId, this.location);
      const selections = this.editor.selectHighlight(this.location);
      this.get('editor').update(selections, {set: {innerHTML: html}});
    },
    togglePopup(){
       this.toggleProperty('popup');
    },
    disableButtons(){
      this.set('disabledButtons', !this.disabledButtons);
    }
  }
});
