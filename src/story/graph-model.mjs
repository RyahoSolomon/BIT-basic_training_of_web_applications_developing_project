// Internal edges are node IDs. Only exit nodes and explicit skip exits hold URLs.
export function validateGraph(scene) {
  const nodes = scene.nodes;
  const target = id => {
    if (typeof id !== 'string' || !Object.hasOwn(nodes, id)) {
      throw new Error('Unknown story node: ' + id);
    }
  };
  const skip = value => {
    if (value === undefined || value === false) return;
    if (value.node !== undefined && value.exit === undefined) target(value.node);
    else if (typeof value.exit !== 'string' || !value.exit || value.node !== undefined) {
      throw new Error('Story skip needs either a node or an exit');
    }
  };
  target(scene.start);
  skip(scene.skip);
  for (const [id, node] of Object.entries(nodes)) {
    skip(node.skip);
    if (node.type === 'dialogue') {
      if (!Array.isArray(node.lines) || !node.lines.length) throw new Error('Empty dialogue: ' + id);
      target(node.next);
    } else if (node.type === 'intro') {
      if (typeof node.text !== 'string' || (node.duration !== undefined &&
          (!Number.isFinite(node.duration) || node.duration < 0))) throw new Error('Invalid intro: ' + id);
      target(node.next);
    } else if (node.type === 'choice') {
      if (!Array.isArray(node.choices) || !node.choices.length) throw new Error('Empty choice: ' + id);
      const ids = new Set();
      for (const option of node.choices) {
        if (!option.id || ids.has(option.id)) throw new Error('Missing/duplicate choice ID: ' + id);
        ids.add(option.id);
        if (option.repeat && !['always', 'hide', 'disable'].includes(option.repeat)) {
          throw new Error('Invalid choice repetition: ' + id);
        }
        target(option.to);
      }
    } else if (node.type !== 'exit' || typeof node.to !== 'string' || !node.to) {
      throw new Error('Invalid story node: ' + id);
    }
  }
  // Cycles are intentional: a topic may return to its choice menu.
  return scene;
}
