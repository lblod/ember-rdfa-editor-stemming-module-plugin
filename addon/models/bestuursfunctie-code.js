import Model from 'ember-data/model';
import attr from 'ember-data/attr';

export default Model.extend({
  label: attr(),
  scopeNote: attr(),
  uri: attr(),
  rdfaBindings: { // eslint-disable-line ember/avoid-leaking-state-in-ember-object
    class: "http://www.w3.org/2004/02/skos/core#Concept",
    label: "http://www.w3.org/2004/02/skos/core#prefLabel"
   }
});
