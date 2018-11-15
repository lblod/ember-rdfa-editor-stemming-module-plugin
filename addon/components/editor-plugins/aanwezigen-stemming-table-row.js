import Component from '@ember/component';
import layout from '../../templates/components/editor-plugins/aanwezigen-stemming-table-row';

export default Component.extend({
  tagName: 'tr',
  layout,

  actions: {
    updateMandatarisAanwezige(mandataris){
      this.onUpdateMandatarisAanwezige(mandataris);
    },

    addStemmer(){
      this.onAddStemmer();
    },

    removeStemmer(){
      this.onRemoveStemmer();
    },

    removeAanwezige(){
      this.onRemoveAanwezige();
    },

    selectNewPersoon(persoon){
      this.set('newPersoon', persoon);
    },

    cancelAddPersoon(){
      this.set('newPersoon', null);
      this.onCancelAddPersoon();
    },

    saveNewPersoon(){
      this.onSaveNewPersoon(this.newPersoon);
    }
  }
});
