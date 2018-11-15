import Component from '@ember/component';
import layout from '../../templates/components/editor-plugins/edit-stemming';
import { computed } from '@ember/object';
import { A } from '@ember/array';

//TODO: simplify up properties
export default Component.extend({
  layout,

  geheim: computed('stemming.geheim', {
    get(){
      return this.stemming.get('geheim') || false;
    },

    set(k, isGeheim){
      this.stemming.set('geheim', isGeheim);
      return isGeheim;
    }
  }),

  viewModeOpenbaar: computed('stemming.geheim', function(){
    return !(this.stemming.get('geheim') || false);
  }),

  aantalOnthouders: computed('stemming.aantalOnthouders', {
    get(){
      return this.stemming.get('aantalOnthouders') || 0;
    },

    set(k, v){
      this.stemming.set('aantalOnthouders', parseInt(v));
      return v;
    }

  }),

  aantalVoorstanders: computed('stemming.aantalVoorstanders', {
    get(){
      return this.stemming.get('aantalVoorstanders') || 0;
    },

    set(k, v){
      this.stemming.set('aantalVoorstanders', parseInt(v));
      return v;
    }
  }),

  aantalTegenstanders: computed('stemming.aantalTegenstanders', {
    get(){
      return this.stemming.get('aantalTegenstanders') || 0;
    },

    set(k, v){
      this.stemming.set('aantalTegenstanders', parseInt(v));
      return v;
    }
  }),

  gevolg: computed('stemming.gevolg', {
    get(){
      return this.stemming.get('gevolg');
    },

    set(k, v){
      this.stemming.set('gevolg', v);
      return v;
    }
  }),

  onderwerp: computed('stemming.onderwerp', {
    get(){
      return this.stemming.get('onderwerp');
    },

    set(k, v){
      this.stemming.set('onderwerp', v);
      return v;
    }
  }),

  didReceiveAttrs() {
    this._super(...arguments);
    this.set('propsToSave', {});
  },

  actions: {
    save(){
      if(this.stemming.geheim){
        this.stemming.set('voorstanders', A());
        this.stemming.set('tegenstanders', A());
        this.stemming.set('onthouders', A());
      }
      this.onSave(this.stemming);
    },
    cancel(){
      this.onCancel();
    }
  }
});
