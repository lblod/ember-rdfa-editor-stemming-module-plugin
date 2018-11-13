import Component from '@ember/component';
import layout from '../../templates/components/editor-plugins/mandataris-selector';
import { computed } from '@ember/object';
import { task } from 'ember-concurrency';

export default Component.extend({
  layout,

  needsSelectbox: computed('mandatarissen', function(){
    if(this.mandatarissen && this.mandatarissen.length > 1)
      return true;
    return false;
  }),
  
  actions: {
    select(mandataris){
      this.onChange(mandataris);
    }
  }
});
