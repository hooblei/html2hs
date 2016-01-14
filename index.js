'use strict';

var Parser = require('htmlparser2').Parser;
var svgns = require('./lib/svg-namespaces');
var tcc = require('to-camel-case');

var thisIsSVGTag = svgns.thisIsSVGTag;
var getSVGNamespace = svgns.getSVGNamespace;
var getSVGAttributeNamespace = svgns.getSVGAttributeNamespace;
var stringify = JSON.stringify;


module.exports = transform;


function Node(name, attributes, children) {
  this.name = name;
  this.attributes = attributes || {};
  this.children = children || [];
}

function Context() {
  this.code = [];
  this.stack = [];
}

function push(ctx, s) {
  ctx.code.push.apply(ctx.code, Array.prototype.slice.call(arguments, 1));
}

function pushOpen(ctx, s) {
  push(ctx, s, ' ');
}

function pushClose(ctx, s) {
  popComma(ctx);
  push(ctx, ' ', s);
}

function pop(ctx) {
  ctx.code.pop();
}

function pushComma(ctx) {
  push(ctx, ', ');
}

function popComma(ctx) {
  if (ctx.code[ctx.code.length - 1].trim() == ',') {
    pop(ctx);
  }
}

function pushArray(ctx, a) {
  pushOpen(ctx, '[');
  var last = a.length - 1;
  a.forEach(function (v, i) {
    if (v instanceof Node) {
      pushNode(ctx, v);
    } else if (Array.isArray(v)) {
      pushArray(ctx, v);
    } else if (v === Object(v)) {
      pushObject(ctx, v);
    } else {
      push(ctx, value(v, stringify));
    }
    pushComma(ctx);
  });
  pushClose(ctx, ']');
}

function pushObject(ctx, o) {
  pushOpen(ctx, '{');
  Object.keys(o).forEach(function (k) {
    var v = o[k];
    push(ctx, stringify(k) + ': ');
    if (v instanceof Node) {
      pushNode(ctx, v);
    } else if (Array.isArray(v)) {
      pushArray(ctx, v);
    } else if (v === Object(v)) {
      pushObject(ctx, v);
    } else {
      push(ctx, value(v, stringify));
    }
    pushComma(ctx);
  });
  pushClose(ctx, '}');
}

function pushFn(ctx, n, a) {
  push(ctx, n + '(');
  a.forEach(function (v) {
    if (v instanceof Node) {
      pushNode(ctx, v);
    } else if (Array.isArray(v)) {
      pushArray(ctx, v);
    } else if (v === Object(v)) {
      pushObject(ctx, v);
    } else {
      push(ctx, value(v, stringify));
    }
    pushComma(ctx);
  })
  popComma(ctx);
  push(ctx, ')');
}

function pushNode(ctx, n) {
  pushFn(ctx, 'h', [
    n.name,
    parseAttributes(n.name, n.attributes),
    n.children
  ]);
}

function pass(v) {
  return v;
}

function value(s, encode) {
  var l = s.length;
  var b = [];
  var i = 0;
  var pat = /\$\{/g;
  var m;
  var c;
  var n;

  while (m = pat.exec(s)) {
    if (m.index) {
      b.push(encode(s.slice(i, m.index)));
    }
    n = 1;
    i = m.index + 2;
    while (i < l) {
      c = s[i];
      n += ((c == '{') && 1) || (c == '}') && -1 || 0;
      i += 1;
      if (!n) {
        b.push('(' + s.slice(m.index + 2, i - 1) + ')');
        break;
      }
    }
  }

  if (i < l) {
    b.push(encode(s.slice(i)));
  }

  return b.join(' + ');
}

function parseStyle(s) {
  return s.split(';').reduce(function (a, s) {
    var p = s.split(':');
    a[p[0].trim()] = value(p.slice(1).join('').trim(), pass);
    return a;
  }, {});
}

function parseAttributes(name, attrs) {
  // TODO: SVG attributes, ns, etc

  var p = Object.keys(attrs).reduce(function (a, k) {
    var v = attrs[k];

    if (k === 'style') {
      a.style = parseStyle(v);
    } else if (k.slice(0, 5) === 'data-') {
      a.dataset[tcc(k.slice(5))] = v;
    } else {
      a.attributes[k] = v;
    }

    return a;
  }, {
    style: {},
    attributes: {},
    dataset: {}
  });

  return Object.keys(p).reduce(function (a, k) {
    if (Object.keys(p[k]).length) {
      a[k] = p[k];
    }
    return a;
  }, {});
}

function transform(s) {
  var ctx = new Context();

  (new Parser({

    ontext: function (t) {
      if (ctx.stack.length) {
        ctx.stack[0].children.push(t);
      } else {
        // error?
      }
    },

    onopentag: function (name, attributes) {
      ctx.stack.unshift(new Node(name, attributes, []));
    },

    onclosetag: function () {
      var node = ctx.stack.shift();

      if (ctx.stack.length) {
        ctx.stack[0].children.push(node);
      } else {
        pushNode(ctx, node);
      }
    }

  })).parseComplete(s);

  return ctx.code.join('');
}

