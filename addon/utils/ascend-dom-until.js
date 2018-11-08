export default function ascendDomUntil(rootNode, domNode, condition){
  if(!domNode || rootNode.isEqualNode(domNode)) return null;
  if(!condition(domNode))
    return ascendDomUntil(rootNode, domNode.parentElement, condition);
  return domNode;
}
