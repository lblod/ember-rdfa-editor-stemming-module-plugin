import Component from '@ember/component';
import layout from '../../templates/components/editor-plugins/stemming-container';
import ascendDomUntil from '../../utils/ascend-dom-until';
import RdfaContextScanner from '@lblod/ember-rdfa-editor/utils/rdfa-context-scanner';
import { inject as service } from '@ember/service';
import { task } from 'ember-concurrency';
import { A } from '@ember/array';

export default Component.extend({
  layout,
  metaModelQuery: service(),
  tripleSerialization: service('triplesSerializationUtils'),

  isDomNodeBehandelingVanAgendapunt(domNode){
    let besluit = 'http://data.vlaanderen.be/ns/besluit#';
    if(!domNode.attributes || !domNode.attributes.resource)
      return false;
    let expandedUri = domNode.attributes.resource.value.replace('besluit:', besluit);
    if(expandedUri == this.behandelingVanAgendapuntUri)
      return true;
    return false;
  },

  findDomNodeAgendaPunt(agendapuntUri){
    //TODO: handle expanded stuff
    //TODO: this is naive
    //<span property="besluit:heeftAgendapunt" resource="http://data.lblod.info/id/agendapunten/45a340b1-2c99-44a0-8f3a-822b311e59f4" typeof="besluit:Agendapunt">
    let apRefs = document.querySelectorAll(`[resource='${agendapuntUri}']`);
    for(let apRef of apRefs){
      if(!apRef.attributes || !apRef.attributes.property)
        continue;
      if(!apRef.attributes.property == 'besluit:behandelt')
        continue;
      return apRef;
    }
  },

  async addAgendaFromBehandelingVanAP(bvap){
    if(bvap.get('onderwerp.0.uri')){
      let subjectUri =bvap.get('onderwerp.0.uri');
      let apDomNode = this.findDomNodeAgendaPunt(subjectUri);
      let triples = this.serializeTableToTriples(apDomNode);
      let ap = await this.tripleSerialization.constructResource(subjectUri, triples, 'http://data.vlaanderen.be/ns/besluit#Agendapunt', true);
      bvap.set('onderwerp', A([ap]));
    }
  },

  async constructBehandelingVanAp(){
    let agendapuntTriples = this.serializeTableToTriples(this.domNodeBehandelingAP);
    let bvap = await this.tripleSerialization.constructResource(this.behandelingVanAgendapuntUri, agendapuntTriples, null, true);
    await this.addAgendaFromBehandelingVanAP(bvap);
    this.set('bvap', bvap);
  },

  serializeTableToTriples(table){
    const contextScanner = RdfaContextScanner.create({});
    const contexts = contextScanner.analyse(table).map((c) => c.context);
    if(contexts.length == 0)
      return [];
    return Array.concat(...contexts);
  },

  setBehandelingVanAP(){
    let domNodeBehandeling = ascendDomUntil(this.editorRootNode, this.domTable, this.isDomNodeBehandelingVanAgendapunt.bind(this));
    this.set('domNodeBehandelingAP', domNodeBehandeling);
  },


  loadData: task(function *(){
    this.setBehandelingVanAP();
    yield this.constructBehandelingVanAp();
  }),

  didReceiveAttrs() {
    this._super(...arguments);
    if(this.behandelingVanAgendapuntUri)
      this.loadData.perform();
  }
});
