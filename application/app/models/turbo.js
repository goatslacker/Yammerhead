/*global window ActiveXObject */
/*
  The MIT License

  Copyright (c) 2010 Joshua Perez http://webos.7bc7.com

  Permission is hereby granted, free of charge, to any person obtaining a copy
  of this software and associated documentation files (the "Software"), to deal
  in the Software without restriction, including without limitation the rights
  to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
  copies of the Software, and to permit persons to whom the Software is
  furnished to do so, subject to the following conditions:

  The above copyright notice and this permission notice shall be included in
  all copies or substantial portions of the Software.

  THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
  IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
  FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
  AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
  LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
  OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
  THE SOFTWARE.
*/

/* turbo.js */
var Turbo = {
  type: 'webOS',
  version: '1.0.5',
  controller: {
    get: function () {
      return false
    }
  },
  $nodes: { },

/*
  Returns an Element from the DOM
  @param {string} id - the ID of the element to retrieve
  @return {Object} if found, the element, otherwise false
*/
  $: function (id) {
    return this.$nodes[id] ? this.$nodes[id] : this.$nodes[id] = this.controller.get(id);
  },

/*
  Attaches a function to another function 
  Thanks to Prototype Framework for the idea and the lesson: http://prototypejs.org/assets/2009/8/31/prototype.js
  @param {Object} obj - the function that will be executed
  @param {Object} context - the scope to use in the callback (this, document, window)
  @param {Params} params - additional parameters (comma delimited) to pass to the return function
  @return {Object} the binded function
*/
  attach: function (obj, context) {
    var args = Array.prototype.slice.call(arguments, 2);

    return function () {
      if (arguments.length > 0) {
        for (var i = 0; i < arguments.length; i = i + 1) {
          args.push(arguments[i]);
        }
      }
      obj.apply(context, args);
    };
  },

/*
  Returns the object passed with default parameters
  @param {Object} obj - object to parse
  @param {Object} params - default parameters to use if they are missing
  @return {Object} obj - the modified object
*/
  defaults: function (obj, params) {
    obj = obj || {};
    for (var property in params) {
      if (params.hasOwnProperty(property)) {
        obj[property] = (obj[property] === undefined) ? params[property] : obj[property];
      }
    }

    return obj;
  }

};

/* effects.js */
/*
  Animates a DOM object's styles
  @param {Object|string} element - The DOM element that will be animated
  @param {string} style - targetted styles written in CSS-like syntax
  @param {Object} opts - options to use
  @param {Object} callback - a function to be called after animations complete

  // emile.js (c) 2009 Thomas Fuchs
  Emile bit taken from emile.js (http://github.com/madrobby/emile/blob/master/emile.js) and then modified and documented to fit TurboJS
  This code is licensed under the terms of the MIT license (see above for terms)
*/
Turbo.Effects = function (element, style, opts, callback) {
  return Turbo.Animation.start(element, style, opts, callback);
}
Turbo.Animation = {
  timer: false,
  elementQueue: [],

  emile: {
    properties: ['backgroundColor', 'borderBottomColor', 'borderBottomWidth', 'borderLeftColor', 'borderLeftWidth',
      'borderRightColor', 'borderRightWidth', 'borderSpacing', 'borderTopColor', 'borderTopWidth', 'bottom', 'color', 'fontSize',
      'fontWeight', 'height', 'left', 'letterSpacing', 'lineHeight', 'marginBottom', 'marginLeft', 'marginRight', 'marginTop', 'maxHeight',
      'maxWidth', 'minHeight', 'minWidth', 'opacity', 'outlineColor', 'outlineOffset', 'outlineWidth', 'paddingBottom', 'paddingLeft',
      'paddingRight', 'paddingTop', 'right', 'textIndent', 'top', 'width', 'wordSpacing', 'zIndex'],
    parseEl: false,

    interpolate: function (source, target, pos) { 
      return (source + (target - source) * pos).toFixed(3);
    },

    parse: function (property) {
      var p = parseFloat(property), q = property.replace(/^[\-\d\.]+/, '');
      return { value: p, func: this.interpolate, suffix: q };
    },

    normalize: function (style) {
      var css, rules = {}, i = this.properties.length;

      this.parseEl.innerHTML = '<div style="' + style + '"></div>';
      css = this.parseEl.childNodes[0].style;

      while (i >= 0) {
        if (css[this.properties[i]]) {
          rules[this.properties[i]] = this.parse(css[this.properties[i]]);
        }
        i = i - 1;
      }

      return rules;
    },

  },

  start: function (element, style, opts, callback) {
    element = (typeof(element) === "string") ? Turbo.$(element) : element;

    opts = Turbo.defaults(opts, {
      duration: 500,
      easing: function (pos) { 
        return (-Math.cos(pos * Math.PI) / 2) + 0.5; 
      }
    });

    if (!this.emile.parseEl) {
      this.emile.parseEl = document.createElement('div');
    }

    var target = this.emile.normalize(style), 
    comp = element.currentStyle ? element.currentStyle : getComputedStyle(element, null),
    property, 
    current = {}, 
    start = Date.now(), 
    end = start + opts.duration,
    id = this.elementQueue.length;

    for (property in target) {
      if (target.hasOwnProperty(property)) {
        current[property] = this.emile.parse(comp[property]);
      }
    }

    this.elementQueue.push({
      id: id,
      element: element,
      opts: opts,
      start: start,
      end: end,
      target: target,
      current: current,
      callback: callback
    });

    if (!this.timer) {
      this.timer = setInterval(Turbo.attach(this.run, this), 10);
    }

    return id;
  },

  stop: function (id) {
    id = id || false;
  
    if (typeof(id) === "number") {
      this.elementQueue[id] = null;
    } else if (typeof(id) === "object") {
      for (var i = 0; i < id.length; i = i + 1) {
        this.elementQueue[id[i]] = null;
      }
    } else {
      clearInterval(this.timer);
      this.timer = false;
      this.elementQueue = [];
    }
  },

  run: function () {
    var time = Date.now(), pos, property, i, j = 0, obj;
    for (i = 0; i < this.elementQueue.length; i = i + 1) {
      obj = this.elementQueue[i];

      if (obj == null) {
        j = j + 1;
        if (j === this.elementQueue.length) {
          this.stop();
        }

        continue;
      }

      pos = (time > obj.end) ? 1 : (time - obj.start) / obj.opts.duration;

      if (!obj) {
        this.elementQueue[i] = null;
      }

      for (property in obj.target) {
        if (obj.target.hasOwnProperty(property)) {
          obj.element.style[property] = obj.target[property].func(obj.current[property].value, obj.target[property].value, obj.opts.easing(pos)) + obj.target[property].suffix;
        }
      }
      
      if (time > obj.end) {
        if (obj.callback) {
          obj.callback();
        }
        this.elementQueue[i] = null;
      }

    }
  }
};
