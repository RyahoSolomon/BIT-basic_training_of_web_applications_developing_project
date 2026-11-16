import assert from 'node:assert/strict';
import { test } from 'node:test';
import { validateGraph } from '../src/story/graph-model.mjs';

function conversation() {
  return {
    start: 'menu', skip: { node: 'menu' },
    nodes: {
      menu: { type: 'choice', choices: [
        { id: 'ask', to: 'topic', repeat: 'always' },
        { id: 'finish', to: 'exit' },
      ] },
      topic: { type: 'dialogue', lines: [{ text: '补充对白' }], next: 'menu' },
      exit: { type: 'exit', to: '../../map/index.html' },
    },
  };
}

test('repeated topics and shared destinations form valid cycles without mutating the graph', () => {
  const scene = conversation();
  const original = structuredClone(scene);
  scene.nodes.menu.choices.push({ id: 'also-ask', to: 'topic', repeat: 'disable' });
  original.nodes.menu.choices.push({ id: 'also-ask', to: 'topic', repeat: 'disable' });
  assert.equal(validateGraph(scene), scene);
  assert.deepEqual(scene, original);
});

test('all internal entry, choice, continuation and skip edges must resolve before playback', () => {
  for (const edit of [
    scene => { scene.start = 'missing'; },
    scene => { scene.nodes.menu.choices[0].to = 'missing'; },
    scene => { scene.nodes.topic.next = 'missing'; },
    scene => { scene.skip = { node: 'missing' }; },
    scene => { scene.nodes.topic.skip = { node: 'missing' }; },
    scene => { scene.nodes.topic = { type: 'intro', text: '字幕', next: 'missing' }; },
  ]) {
    const scene = conversation();
    edit(scene);
    assert.throws(() => validateGraph(scene), /Unknown story node/);
  }
});

test('ambiguous exits and unusable dialogue or choices are rejected', () => {
  for (const edit of [
    scene => { scene.skip = { node: 'menu', exit: '../../map/index.html' }; },
    scene => { scene.nodes.topic.lines = []; },
    scene => { scene.nodes.menu.choices = []; },
    scene => { scene.nodes.menu.choices[1].id = 'ask'; },
    scene => { scene.nodes.menu.choices[0].repeat = 'unknown'; },
    scene => { scene.nodes.topic = { type: 'intro', text: '字幕', duration: -1, next: 'exit' }; },
    scene => { scene.nodes.exit.to = ''; },
  ]) {
    const scene = conversation();
    edit(scene);
    assert.throws(() => validateGraph(scene));
  }
});
