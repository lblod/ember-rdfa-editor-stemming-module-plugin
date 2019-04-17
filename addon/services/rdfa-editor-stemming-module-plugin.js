import Service from '@ember/service';
import EmberObject from '@ember/object';
import { task } from 'ember-concurrency';
import { isArray } from '@ember/array';
import { warn } from '@ember/debug';
import ascendDomUntil from '../utils/ascend-dom-until';

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
    if (contexts.length === 0) return [];

    const hints = [];
    for(let context of contexts){
      this.setBestuursorgaanIfSet(context.context);
      let triple = this.detectRelevantContext(context);
      if(!triple) continue;

      let domNode = this.findDomNodeForContext(editor, context, this.domNodeMatchesRdfaInstructive(triple));

      if(!domNode) continue;

      if(triple.predicate == this.insertStemmingText){
        hintsRegistry.removeHintsInRegion(context.region, hrId, this.who);
        hints.pushObjects(this.generateHintsForContext(context, triple, domNode, editor));
      }
      let domNodeRegion = [ editor.getRichNodeFor(domNode).start, editor.getRichNodeFor(domNode).end ];
      //make sure no double hinting
      if(triple.predicate == this.stemmingTable && !hints.find(h => h.location[0] == domNodeRegion[0] && h.location[1] == domNodeRegion[1])){
        hintsRegistry.removeHintsInRegion(domNodeRegion, hrId, this.who);
        hints.pushObjects(this.generateHintsForContext(context, triple, domNode, editor));
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
  detectRelevantContext(context){
    if(context.context.slice(-1)[0].predicate == this.insertStemmingText){
      return context.context.slice(-1)[0];
    }
    if(context.context.find(t => t.predicate == this.stemmingTable)){
      return context.context.find(t => t.predicate == this.stemmingTable);
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
        label: 'Voeg tabel van fracties toe',
        plainValue: hint.text,
        location: hint.location,
        domNodeToUpdate: hint.domNode,
        instructiveUri: hint.instructiveUri,
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
  generateHintsForContext(context, instructiveTriple, domNode, editor, options = {}){
    const hints = [];
    const text = context.text;
    let location = context.region;
    if(instructiveTriple.predicate == this.stemmingTable){
      location = [ editor.getRichNodeFor(domNode).start, editor.getRichNodeFor(domNode).end ];
      options.noHighlight = true;
    }
    let behandelingVanAgendapuntUri = context.context.slice(0).reverse().find(t => t.predicate == 'a' && t.object == 'http://data.vlaanderen.be/ns/besluit#BehandelingVanAgendapunt');
    hints.push({text, location, domNode,
                instructiveUri: instructiveTriple.predicate,
                behandelingVanAgendapuntUri: behandelingVanAgendapuntUri.subject,
                options});
    return hints;
  },

  domNodeMatchesRdfaInstructive(instructiveRdfa){
    let ext = 'http://mu.semte.ch/vocabularies/ext/';
    return (domNode) => {
      if(!domNode.attributes || !domNode.attributes.property)
        return false;
      let expandedProperty = domNode.attributes.property.value.replace('ext:', ext);
      if(instructiveRdfa.predicate == expandedProperty)
        return true;
      return false;
    };
  },

  findDomNodeForContext(editor, context, condition){
    let richNodes = isArray(context.richNode) ? context.richNode : [ context.richNode ];
    let domNode = richNodes
          .map(r => ascendDomUntil(editor.rootNode, r.domNode, condition))
          .find(d => d);
    if(!domNode){
      warn(`Trying to work on unattached domNode. Sorry can't handle these...`, {id: 'stemming.domNode'});
    }
    return domNode;
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
