import Component from '@ember/component';
import layout from '../../templates/components/editor-plugins/manage-stemmers-table-row';

export default Component.extend({
  tagName: 'tr',
  layout,

  actions: {
    updateMandataris(mandataris){
      this.onUpdateMandataris(mandataris);
    },

    updateStembehaviour(stemBehaviour){
      this.updateStembehaviour(stemBehaviour);
    },

    deleteRow(){
      this.onDeleteRow();
    },

    selectNewPersoon(persoon){
      this.set('newPersoon', persoon);
    },

    cancelAddStemmer(){
      this.set('newPersoon', null);
      this.onCancelAddStemmer();
    },

    saveNewPersoon(){
      this.onSaveNewPersoon(this.newPersoon);
    }
  }
});
