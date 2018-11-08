import Component from '@ember/component';
import layout from '../../templates/components/editor-plugins/stemming-container';
import ascendDomUntil from '../../utils/ascend-dom-until';
import RdfaContextScanner from '@lblod/ember-rdfa-editor/utils/rdfa-context-scanner';
import { constructResource } from '../../utils/triples-serialization-utils';
import { inject as service } from '@ember/service';
import { task } from 'ember-concurrency';
import { A } from '@ember/array';

export default Component.extend({
  layout,
  metaModelQuery: service(),

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
      if(!apRef.attributes.property == 'besluit:heeftAgendapunt')
        continue;
      return apRef;
    }
  },

  async addAgendaFromBehandelingVanAP(bvap){
    if(bvap.get('onderwerp.0.uri')){
      let subjectUri =bvap.get('onderwerp.0.uri');
      let apDomNode = this.findDomNodeAgendaPunt(subjectUri);
      let triples = this.serializeTableToTriples(apDomNode);
      let ap = await constructResource(this.metaModelQuery, subjectUri, triples, 'http://data.vlaanderen.be/ns/besluit#Agendapunt');
      bvap.set('onderwerp', A([ap]));
    }
  },

  async constructBehandelingVanAp(){
    let domNodeBehandeling = ascendDomUntil(this.editorRootNode, this.domTable, this.isDomNodeBehandelingVanAgendapunt.bind(this));
    let agendapuntTriples = this.serializeTableToTriples(domNodeBehandeling);
    let bvap = await constructResource(this.metaModelQuery, this.behandelingVanAgendapuntUri, agendapuntTriples);
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

  loadData: task(function *(){
    yield this.constructBehandelingVanAp();
  }),

  didReceiveAttrs() {
    this._super(...arguments);
    if(this.behandelingVanAgendapuntUri)
      this.loadData.perform();
  },

});
