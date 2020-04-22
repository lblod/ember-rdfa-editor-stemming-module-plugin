import Service from '@ember/service';
import EmberObject from '@ember/object';
import { task } from 'ember-concurrency';

/**
 * Service responsible for correct management of a stemming
 * ---------------------------------------------------
 * CODE REVIEW NOTES
 * ---------------------------------------------------
 *
 *  INTERACTION PATTERNS
 *  --------------------
 *  For all incoming contexts, first looks whether there is an rdfa instructive to manage stemming.
 *  If encountered, a hint is set on the content of the instructive, the DOM node is passed to the card.
 *  Once loaded, the management occurs in a modal. On insert the dom node is updated/replaced.
 *
 *  This plugin uses the document as a datastore (along with the normal backend):
 *   - on edit, to keep track of which stemmers have already been inserted
 *   - on create copy potential stemmers from aanwezigen at agendapunt
 *   - on create/edit: copy some the content (title agendapunt) in the manage modal
 *
 *  POTENTIAL ISSUES/TODO
 *  ---------------------
 *  - The domNode is passed to the card. At insertion time, the domNode may be detached from tree, which results in broken plugin.
 *
 *   - Performance: A scan on RDFA content is slow once we have a lot of aanwezigen
 *
 *  - The whole voting is a complex use case. Moreover, it has been translated in code vomit (@thx felix :-) and needs a rewrite.
 *    Furthermore, the current RDFA output clutters the whole document and will be in need of a complex serialization to
 *    an inline component, untested so far
 *
 *  OTHER INFO
 *  ----------
 *  - uses metamodel plugin utils to:
 *    deserialize triples to ember object
 * ---------------------------------------------------
 * END CODE REVIEW NOTES
 * ---------------------------------------------------
 * @module editor-stemming-module-plugin
 * @class RdfaEditorStemmingModulePlugin
 * @constructor
 * @extends EmberService
 */
const RdfaEditorStemmingModulePlugin = Service.extend({
  insertStemmingText: 'http://mu.semte.ch/vocabularies/ext/insertStemmingText',
  stemmingTable: 'http://mu.semte.ch/vocabularies/ext/stemmingTable',

  /**
   * Restartable task to handle the incoming events from the editor dispatcher
   *
   * @method execute
   *
   * @param {string} hrId Unique identifier of the event in the hintsRegistry
   * @param {Array} contexts RDFa contexts of the text snippets the event applies on
   * @param {Object} hintsRegistry Registry of hints in the editor
   * @param {Object} editor The RDFa editor instance
   *
   * @public
   */
  execute: task(function * (hrId, contexts, hintsRegistry, editor) {
    hintsRegistry.removeHints( { rdfaBlocks: contexts, hrId, scope: this.get('who') } );

    const hints = [];
    for(let context of contexts){
      this.setBestuursorgaanIfSet(context.context);

      let contextResult = this.detectRelevantContext(context);
      if(!contextResult) continue;
      const {semanticNode, predicate} = contextResult;

      if(predicate == this.insertStemmingText){
        hints.pushObjects(this.generateHintsForContext(context, predicate, semanticNode, editor));
      }
      let domNodeRegion = [ semanticNode.start, semanticNode.end ];
      //make sure no double hinting
      if(predicate == this.stemmingTable && !hints.find(h => h.location[0] == domNodeRegion[0] && h.location[1] == domNodeRegion[1])){
        hints.pushObjects(this.generateHintsForContext(context, predicate, semanticNode, editor));
      }
    }

    const cards = hints.map( (hint) => this.generateCard(hrId, hintsRegistry, editor, hint, this.who));
    if(cards.length > 0){
      hintsRegistry.addHints(hrId, this.who, cards);
    }
  }).keepLatest(),

  /**
   * Given context object, tries to detect a context the plugin can work on
   *
   * @method detectRelevantContext
   *
   * @param {Object} context Text snippet at a specific location with an RDFa context
   *
   * @return {String} URI of context if found, else empty string.
   *
   * @private
   */
  detectRelevantContext({ semanticNode }){
    if (semanticNode.rdfaAttributes && semanticNode.rdfaAttributes.properties) {
      const properties = semanticNode.rdfaAttributes.properties || A();
      if (properties.includes(this.insertStemmingText)) {
        return {semanticNode, predicate: this.insertStemmingText};
      }
      if (properties.includes(this.stemmingTable)) {
        return {semanticNode, predicate: this.stemmingTable};
      }
    }

    return null;
  },

  /**
   * Generates a card given a hint
   *
   * @method generateCard
   *
   * @param {string} hrId Unique identifier of the event in the hintsRegistry
   * @param {Object} hintsRegistry Registry of hints in the editor
   * @param {Object} editor The RDFa editor instance
   * @param {Object} hint containing the hinted string and the location of this string
   *
   * @return {Object} The card to hint for a given template
   *
   * @private
   */
  generateCard(hrId, hintsRegistry, editor, hint, cardName){
    return EmberObject.create({
      info: {
        label: 'Voeg stemming toe',
        plainValue: hint.text,
        location: hint.location,
        semanticNode: hint.semanticNode,
        instructiveUri: hint.predicate,
        hrId, hintsRegistry, editor,
        behandelingVanAgendapuntUri: hint.behandelingVanAgendapuntUri
      },
      location: hint.location,
      options: hint.options,
      card: cardName
    });
  },

  /**
   * Generates a hint, given a context
   *
   * @method generateHintsForContext
   *
   * @param {Object} context Text snippet at a specific location with an RDFa context
   *
   * @return {Object} [{dateString, location}]
   *
   * @private
   */
  generateHintsForContext(context, predicate, semanticNode, editor, options = {}){
    const hints = [];
    const text = context.text || '';
    let location = context.region;
    if(predicate == this.stemmingTable){
      location = [ semanticNode.start, semanticNode.end ];
      options.noHighlight = true;
      options.editMode = true;
    }
    let behandelingVanAgendapuntUri = context.context.slice(0).reverse()
        .find(t => t.predicate == 'a' && t.object == 'http://data.vlaanderen.be/ns/besluit#BehandelingVanAgendapunt').subject;
    hints.push({text, location, semanticNode, predicate, behandelingVanAgendapuntUri, options});
    return hints;
  },

  setBestuursorgaanIfSet(triples) {
    const zitting = triples.find((triple) => triple.object === 'http://data.vlaanderen.be/ns/besluit#Zitting');
    if (zitting) {
      const bestuursorgaan = triples.find((triple) => triple.subject === zitting.subject && triple.predicate === 'http://data.vlaanderen.be/ns/besluit#isGehoudenDoor');
      if (bestuursorgaan){
        this.set('bestuursorgaanUri', bestuursorgaan.object);
      }
    }
  }
});

RdfaEditorStemmingModulePlugin.reopen({
  who: 'editor-plugins/stemming-module-card'
});
export default RdfaEditorStemmingModulePlugin;
