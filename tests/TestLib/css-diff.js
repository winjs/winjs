(function (api) {
  api.diff = function (htmlText, stylesheetTextA, stylesheetTextB) {
    var stylesA = buildStyleObject(htmlText, stylesheetTextA);
    var stylesB = buildStyleObject(htmlText, stylesheetTextB);

    return diffStyleTrees(stylesA, stylesB);
  };

  var buildStyleObject = function (htmlText, stylesheetText) {
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
    iframe.parentNode.removeChild(iframe);
    return styleTree;
  };

  var pseudos = ['hover', 'active', 'disabled'];

  var diffStyleTrees = function (expectedTree, actualTree, results) {
    results = results || [];
    var deltaMap = {};

    // Compare left styles to right styles
    for (var pseudo in expectedTree.style) {
      for (var cssProperty in expectedTree.style[pseudo]) {
        if (expectedTree.style[pseudo][cssProperty] !== actualTree.style[pseudo][cssProperty]) {
          var result = {
            element: expectedTree.element,
            pseudo: pseudo,
            property: cssProperty,
            expected: expectedTree.style[pseudo][cssProperty],
            actual: actualTree.style[pseudo][cssProperty]
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
    for (var i = 0; i < expectedTree.children.length; ++i) {
      diffStyleTrees(expectedTree.children[i], actualTree.children[i], results);
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
      for (var property in style) {
        if (typeof style[property] === 'string' && property !== 'cssText') {
          savedStyle[property] = style[property];
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