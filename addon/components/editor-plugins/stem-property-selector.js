import Component from '@ember/component';
import layout from '../../templates/components/editor-plugins/stem-property-selector';
import { inject as service } from '@ember/service';
import { A } from '@ember/array';
import { oneWay } from '@ember/object/computed';
import { task } from 'ember-concurrency';

export default Component.extend({
  layout,
  metaModelQuery: service(),

  _stemProperty: oneWay('stemProperty'),

  loadData: task(function*(){
    let voorstanderProp = (yield this.metaModelQuery.getPropertiesForLabel('voorstanders')).firstObject;
    let tegenstanderProp = (yield this.metaModelQuery.getPropertiesForLabel('tegenstanders')).firstObject;
    let onthouderProp = (yield this.metaModelQuery.getPropertiesForLabel('onthouders')).firstObject;
    this.set('stemProperties', A([voorstanderProp, tegenstanderProp, onthouderProp]));
  }),

  didReceiveAttrs() {
    this._super(...arguments);
    this.loadData.perform();
  },

  actions: {
    select(stemProperty){
      this.set('_stemProperty', stemProperty);
      this.onSelect(stemProperty);
    }
  }
});
