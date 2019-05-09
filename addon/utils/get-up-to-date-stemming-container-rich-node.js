export default function getUpToDateStemmingContainer( { hrId, editor, hintsRegistry, location } ) {
  let region = hintsRegistry.updateLocationToCurrentIndex(hrId, location);
  const contexts = editor.getContexts({ region });
  
  const baseUri = 'http://mu.semte.ch/vocabularies/ext/';
  const context = contexts.find(( snippet) =>  {
    const properties = [
      'http://mu.semte.ch/vocabularies/ext/insertStemmingText',
      'http://mu.semte.ch/vocabularies/ext/stemmingTable'
    ];
    const node = snippet.semanticNode;
    return node.rdfaAttributes.property && properties.includes(node.rdfaAttributes.property.replace('ext:', baseUri));
  });

  if (context) {
    return context.semanticNode;
  }
  return {};
};
