import Component from '@ember/component';
import layout from '../../templates/components/editor-plugins/edit-stemming';
import { computed } from '@ember/object';
import { oneWay } from '@ember/object/computed';

export default Component.extend({
  layout,

  geheim: computed('stemming.geheim', {
    get(){
      return this.stemming.get('geheim') || false;
    },

    set(k, v){
      this.propsToSave['geheim' ] = parseInt(v);
      return v;
    }

  }),

  aantalOnthouders: computed('stemming.aantalOnthouders', {
    get(){
      return this.stemming.get('aantalOnthouders') || 0;
    },

    set(k, v){
      this.propsToSave['aantalOnthouders'] = parseInt(v);
      return v;
    }

  }),

  aantalVoorstanders: computed('stemming.aantalVoorstanders', {
    get(){
      return this.stemming.get('aantalVoorstanders') || 0;
    },

    set(k, v){
      this.propsToSave['aantalVoorstanders'] = parseInt(v);
      return v;
    }
  }),

  aantalTegenstanders: computed('stemming.aantalTegenstanders', {
    get(){
      return this.stemming.get('aantalTegenstanders') || 0;
    },

    set(k, v){
      this.propsToSave['aantalTegenstanders'] = parseInt(v);
      return v;
    }
  }),

  gevolg: computed('stemming.gevolg', {
    get(){
      return this.stemming.get('gevolg');
    },

    set(k, v){
      this.propsToSave['gevolg'] = v;
      return v;
    }
  }),

  onderwerp: computed('stemming.onderwerp', {
    get(){
      return this.stemming.get('onderwerp');
    },

    set(k, v){
      this.propsToSave['onderwerp'] = v;
      return v;
    }
  }),

  didReceiveAttrs() {
    this._super(...arguments);
    this.set('propsToSave', {});
  },

  actions: {
    save(){
      Object.keys(this.propsToSave).forEach(p => {
        this.stemming.set(p, this.propsToSave[p]);
      });
      this.onSave(this.stemming);
    },
    cancel(){
      this.onCancel();
    }
  }



});
