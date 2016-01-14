
var test = require('tape');
var html2hs = require('html2hs');
var h = require('virtual-dom/virtual-hyperscript');
var render = require('virtual-dom/create-element');
var Node = require('virtual-dom/vnode/vnode');

var ctx = {
  n: 123,
  t: 'text',
  c: '#ff0000',
  f: function (o) { return o.a.b; },
  p: function (c) { return h('span', [ c.t ]); }
}

function assertNode(assert, node, tagName, properties, children) {
  var child;

  properties = properties || {};
  children = children || [];

  assert.ok(node instanceof Node, "node is a VirtualNode");
  assert.equal(node.tagName, tagName, "tag names are equal");
  assert.deepEqual(node.properties, properties, "propeties are equal");
  assert.equal(node.children.length, children.length, "child count equal");

  for (var i = 0, l = children.length; i < l; i += 1) {
    child = children[i];

    if (typeof child === 'string') {
      assert.equal(node.children[i].text, child);
    } else {

      assertNode(assert,
                 node.children[i],
                 child[0],
                 child[1],
                 child[2])
    }
  }
}

function run(code, ctx) {
  return (new Function('h, ctx', 'return ' + code))(h, ctx);
}

test('text simple', function (assert) {
  var s = '<span>simple</span>'
  var n = run(html2hs(s));
  assertNode(assert, n, 'SPAN', {}, ['simple']);
  assert.end();
});

test('text placeholder', function (assert) {
  var s = '<span>${ctx.t}</span>'
  var n = run(html2hs(s), ctx);
  assertNode(assert, n, 'SPAN', {}, [ ctx.t ]);
  assert.end();
});

test('text placeholder function', function (assert) {
  var s = '<span>${ctx.f({a: {b: "bar"}})}</span>'
  var n = run(html2hs(s), ctx);
  assertNode(assert, n, 'SPAN', {}, [ 'bar' ]);
  assert.end();
});

test('text placeholder partial', function (assert) {
  var s = '<span>${ctx.p(ctx)}</span>'
  var n = run(html2hs(s), ctx);
  assertNode(assert, n.children[0], 'SPAN', {}, [ ctx.t ]);
  assert.end();
})

//test('dataset placeholder', function () {
//  var s = '<span data-foo="${ctx.p(ctx)}"></span>'
//  var n = run(html2hs(s), ctx);
//  console.log(n)
//  //assertNode(assert)
//  assert.end()
//});

test('style simple', function (assert) {
  var s = '<span style="color: red"></span>';
  var n = run(html2hs(s));
  assertNode(assert, n, 'SPAN', { style: { color: 'red' } });
  assert.end()
});

test('style placeholder', function (assert) {
  var s = '<span style="color: ${ctx.c}"></span>';
  var n = run(html2hs(s));
  assertNode(assert, n, 'SPAN', { style: { color: '#ff0000' } });
  assert.end()
});
