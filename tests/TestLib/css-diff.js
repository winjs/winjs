(function (api) {
  api.diff = function (htmlText, stylesheetTextA, stylesheetTextB, callback) {
    var stylesA, stylesB;

    var done = function () {
      var results = diffStyleTrees(stylesA, stylesB);
      callback(results);
    };

    buildStyleObject(htmlText, stylesheetTextA, function (styles) {
      stylesA = styles;
      if (stylesA && stylesB) {
        done();
      }
    });

    buildStyleObject(htmlText, stylesheetTextB, function (styles) {
      stylesB = styles;
      if (stylesA && stylesB) {
        done();
      }
    });
  };

  var buildStyleObject = function (htmlText, stylesheetText, callback) {
    // Make an iframe to scope the test in
    var iframe = document.createElement('iframe');
    iframe.src = 'about:blank';
    iframe.style.width = '100%';
    iframe.style.height = '100%';
    document.body.appendChild(iframe);
    iframe.contentDocument.body.innerHTML = htmlText;

    // Replace pseudo selectors in the text with class names
    var cssText = replacePseudoClasses(stylesheetText);

    // Add the stylesheet to the iframe
    var stylesheet = iframe.contentDocument.createElement('style');
    stylesheet.innerHTML = cssText;
    iframe.contentDocument.head.appendChild(stylesheet);

    // Build the style tree for this stylesheet
    var styleTree = new StyleTree(iframe.contentDocument.body);
    callback(styleTree);
    iframe.parentNode.removeChild(iframe);
  };

  var pseudos = ['hover', 'active', 'disabled'];

  var diffStyleTrees = function (a, b, results) {
    results = results || [];
    var deltaMap = {};

    // Compare left styles to right styles
    for (var pseudo in a.style) {
      for (var i in a.style[pseudo]) {
        if (a.style[pseudo][i] !== b.style[pseudo][i]) {
          var result = {
            element: a.element,
            pseudo: pseudo,
            property: i,
            expected: a.style[pseudo][i],
            actual: b.style[pseudo][i]
          };

          var deltaKey = result.property + result.expected + result.actual;
          if (!deltaMap[deltaKey]) {
            results.push(result);
            deltaMap[deltaKey] = true;
          }
        }
      }
    }

    // Recurse
    for (var i = 0; i < a.children.length; ++i) {
      diffStyleTrees(a.children[i], b.children[i], results);
    }

    return results;
  };

  var replacePseudoClasses = function (stylesheetText) {
    return pseudos.reduce(function (text, s) {
      return text.replace(':' + s, '.pseudo-' + s);
    }, stylesheetText);
  };

  var StyleTree = function (element) {
    this.element = element;

    function savePseudoStyle(pseudo) {
      if (pseudo) {
        element.classList.add('pseudo-' + pseudo);
      }
      var style = window.getComputedStyle(element);
      var savedStyle = {};
      for (var i in style) {
        if (typeof style[i] === 'string' && i !== 'cssText') {
          savedStyle[i] = style[i];
        }
      }
      if (pseudo) {
        element.classList.remove('pseudo-' + pseudo);
      }
      return savedStyle;
    }

    // Copy style properties for each pseudo
    this.style = {'none': savePseudoStyle()};
    for (var i = 0; i < pseudos.length; ++i) {
      this.style[pseudos[i]] = savePseudoStyle(pseudos[i]);
    }

    // Recurse through children
    this.children = [];
    for (var i = 0; i < this.element.children.length; ++i) {
      this.children.push(new StyleTree(this.element.children[i]));
    };
  };

})(this.CSSDiff = this.CSSDiff || {});