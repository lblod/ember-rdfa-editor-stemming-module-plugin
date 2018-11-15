import Component from '@ember/component';
import layout from '../../templates/components/editor-plugins/manage-stemmers-table-row';

export default Component.extend({
  tagName: 'tr',
  layout,

  actions: {
    updateStembehaviour(stemBehaviour){
      this.onUpdateStembehaviour(stemBehaviour);
    }
  }
});
