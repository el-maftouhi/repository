/*
SHJS - Syntax Highlighting in JavaScript
Copyright (C) 2007, 2008 gnombat@users.sourceforge.net
License: http://shjs.sourceforge.net/doc/gplv3.html
*/

if (! this.sh_languages) {
  this.sh_languages = {};
}
var sh_requests = {};

function sh_isEmailAddress(url) {
  if (/^mailto:/.test(url)) {
    return false;
  }
  return url.indexOf('@') !== -1;
}

function sh_setHref(tags, numTags, inputString) {
  var url = inputString.substring(tags[numTags - 2].pos, tags[numTags - 1].pos);
  if (url.length >= 2 && url.charAt(0) === '<' && url.charAt(url.length - 1) === '>') {
    url = url.substr(1, url.length - 2);
  }
  if (sh_isEmailAddress(url)) {
    url = 'mailto:' + url;
  }
  tags[numTags - 2].node.href = url;
}

/*
Konqueror has a bug where the regular expression /$/g will not match at the end
of a line more than once:

  var regex = /$/g;
  var match;

  var line = '1234567890';
  regex.lastIndex = 10;
  match = regex.exec(line);

  var line2 = 'abcde';
  regex.lastIndex = 5;
  match = regex.exec(line2);  // fails
*/
function sh_konquerorExec(s) {
  var result = [''];
  result.index = s.length;
  result.input = s;
  return result;
}

/**
Highlights all elements containing source code in a text string.  The return
value is an array of objects, each representing an HTML start or end tag.  Each
object has a property named pos, which is an integer representing the text
offset of the tag. Every start tag also has a property named node, which is the
DOM element started by the tag. End tags do not have this property.
@param  inputString  a text string
@param  language  a language definition object
@return  an array of tag objects
*/
function sh_highlightString(inputString, language) {
  if (/Konqueror/.test(navigator.userAgent)) {
    if (! language.konquered) {
      for (var s = 0; s < language.length; s++) {
        for (var p = 0; p < language[s].length; p++) {
          var r = language[s][p][0];
          if (r.source === '$') {
            r.exec = sh_konquerorExec;
          }
        }
      }
      language.konquered = true;
    }
  }

  var a = document.createElement('a');
  var span = document.createElement('span');

  // the result
  var tags = [];
  var numTags = 0;

  // each element is a pattern object from language
  var patternStack = [];

  // the current position within inputString
  var pos = 0;

  // the name of the current style, or null if there is no current style
  var currentStyle = null;

  var output = function(s, style) {
    var length = s.length;
    // this is more than just an optimization - we don't want to output empty <span></span> elements
    if (length === 0) {
      return;
    }
    if (! style) {
      var stackLength = patternStack.length;
      if (stackLength !== 0) {
        var pattern = patternStack[stackLength - 1];
        // check whether this is a state or an environment
        if (! pattern[3]) {
          // it's not a state - it's an environment; use the style for this environment
          style = pattern[1];
        }
      }
    }
    if (currentStyle !== style) {
      if (currentStyle) {
        tags[numTags++] = {pos: pos};
        if (currentStyle === 'sh_url') {
          sh_setHref(tags, numTags, inputString);
        }
      }
      if (style) {
        var clone;
        if (style === 'sh_url') {
          clone = a.cloneNode(false);
        }
        else {
          clone = span.cloneNode(false);
        }
        clone.className = style;
        tags[numTags++] = {node: clone, pos: pos};
      }
    }
    pos += length;
    currentStyle = style;
  };

  var endOfLinePattern = /\r\n|\r|\n/g;
  endOfLinePattern.lastIndex = 0;
  var inputStringLength = inputString.length;
  while (pos < inputStringLength) {
    var start = pos;
    var end;
    var startOfNextLine;
    var endOfLineMatch = endOfLinePattern.exec(inputString);
    if (endOfLineMatch === null) {
      end = inputStringLength;
      startOfNextLine = inputStringLength;
    }
    else {
      end = endOfLineMatch.index;
      startOfNextLine = endOfLinePattern.lastIndex;
    }

    var line = inputString.substring(start, end);

    var matchCache = [];
    for (;;) {
      var posWithinLine = pos - start;

      var stateIndex;
      var stackLength = patternStack.length;
      if (stackLength === 0) {
        stateIndex = 0;
      }
      else {
        // get the next state
        stateIndex = patternStack[stackLength - 1][2];
      }

      var state = language[stateIndex];
      var numPatterns = state.length;
      var mc = matchCache[stateIndex];
      if (! mc) {
        mc = matchCache[stateIndex] = [];
      }
      var bestMatch = null;
      var bestPatternIndex = -1;
      for (var i = 0; i < numPatterns; i++) {
        var match;
        if (i < mc.length && (mc[i] === null || posWithinLine <= mc[i].index)) {
          match = mc[i];
        }
        else {
          var regex = state[i][0];
          regex.lastIndex = posWithinLine;
          match = regex.exec(line);
          mc[i] = match;
        }
        if (match !== null && (bestMatch === null || match.index < bestMatch.index)) {
          bestMatch = match;
          bestPatternIndex = i;
          if (match.index === posWithinLine) {
            break;
          }
        }
      }

      if (bestMatch === null) {
        output(line.substring(posWithinLine), null);
        break;
      }
      else {
        // got a match
        if (bestMatch.index > posWithinLine) {
          output(line.substring(posWithinLine, bestMatch.index), null);
        }

        var pattern = state[bestPatternIndex];

        var newStyle = pattern[1];
        var matchedString;
        if (newStyle instanceof Array) {
          for (var subexpression = 0; subexpression < newStyle.length; subexpression++) {
            matchedString = bestMatch[subexpression + 1];
            output(matchedString, newStyle[subexpression]);
          }
        }
        else {
          matchedString = bestMatch[0];
          output(matchedString, newStyle);
        }

        switch (pattern[2]) {
        case -1:
          // do nothing
          break;
        case -2:
          // exit
          patternStack.pop();
          break;
        case -3:
          // exitall
          patternStack.length = 0;
          break;
        default:
          // this was the start of a delimited pattern or a state/environment
          patternStack.push(pattern);
          break;
        }
      }
    }

    // end of the line
    if (currentStyle) {
      tags[numTags++] = {pos: pos};
      if (currentStyle === 'sh_url') {
        sh_setHref(tags, numTags, inputString);
      }
      currentStyle = null;
    }
    pos = startOfNextLine;
  }

  return tags;
}

////////////////////////////////////////////////////////////////////////////////
// DOM-dependent functions

function sh_getClasses(element) {
  var result = [];
  var htmlClass = element.className;
  if (htmlClass && htmlClass.length > 0) {
    var htmlClasses = htmlClass.split(' ');
    for (var i = 0; i < htmlClasses.length; i++) {
      if (htmlClasses[i].length > 0) {
        result.push(htmlClasses[i]);
      }
    }
  }
  return result;
}

function sh_addClass(element, name) {
  var htmlClasses = sh_getClasses(element);
  for (var i = 0; i < htmlClasses.length; i++) {
    if (name.toLowerCase() === htmlClasses[i].toLowerCase()) {
      return;
    }
  }
  htmlClasses.push(name);
  element.className = htmlClasses.join(' ');
}

/**
Extracts the tags from an HTML DOM NodeList.
@param  nodeList  a DOM NodeList
@param  result  an object with text, tags and pos properties
*/
function sh_extractTagsFromNodeList(nodeList, result) {
  var length = nodeList.length;
  for (var i = 0; i < length; i++) {
    var node = nodeList.item(i);
    switch (node.nodeType) {
    case 1:
      if (node.nodeName.toLowerCase() === 'br') {
        var terminator;
        if (/MSIE/.test(navigator.userAgent)) {
          terminator = '\r';
        }
        else {
          terminator = '\n';
        }
        result.text.push(terminator);
        result.pos++;
      }
      else {
        result.tags.push({node: node.cloneNode(false), pos: result.pos});
        sh_extractTagsFromNodeList(node.childNodes, result);
        result.tags.push({pos: result.pos});
      }
      break;
    case 3:
    case 4:
      result.text.push(node.data);
      result.pos += node.length;
      break;
    }
  }
}

/**
Extracts the tags from the text of an HTML element. The extracted tags will be
returned as an array of tag objects. See sh_highlightString for the format of
the tag objects.
@param  element  a DOM element
@param  tags  an empty array; the extracted tag objects will be returned in it
@return  the text of the element
@see  sh_highlightString
*/
function sh_extractTags(element, tags) {
  var result = {};
  result.text = [];
  result.tags = tags;
  result.pos = 0;
  sh_extractTagsFromNodeList(element.childNodes, result);
  return result.text.join('');
}

/**
Merges the original tags from an element with the tags produced by highlighting.
@param  originalTags  an array containing the original tags
@param  highlightTags  an array containing the highlighting tags - these must not overlap
@result  an array containing the merged tags
*/
function sh_mergeTags(originalTags, highlightTags) {
  var numOriginalTags = originalTags.length;
  if (numOriginalTags === 0) {
    return highlightTags;
  }

  var numHighlightTags = highlightTags.length;
  if (numHighlightTags === 0) {
    return originalTags;
  }

  var result = [];
  var originalIndex = 0;
  var highlightIndex = 0;

  while (originalIndex < numOriginalTags && highlightIndex < numHighlightTags) {
    var originalTag = originalTags[originalIndex];
    var highlightTag = highlightTags[highlightIndex];

    if (originalTag.pos <= highlightTag.pos) {
      result.push(originalTag);
      originalIndex++;
    }
    else {
      result.push(highlightTag);
      if (highlightTags[highlightIndex + 1].pos <= originalTag.pos) {
        highlightIndex++;
        result.push(highlightTags[highlightIndex]);
        highlightIndex++;
      }
      else {
        // new end tag
        result.push({pos: originalTag.pos});

        // new start tag
        highlightTags[highlightIndex] = {node: highlightTag.node.cloneNode(false), pos: originalTag.pos};
      }
    }
  }

  while (originalIndex < numOriginalTags) {
    result.push(originalTags[originalIndex]);
    originalIndex++;
  }

  while (highlightIndex < numHighlightTags) {
    result.push(highlightTags[highlightIndex]);
    highlightIndex++;
  }

  return result;
}

/**
Inserts tags into text.
@param  tags  an array of tag objects
@param  text  a string representing the text
@return  a DOM DocumentFragment representing the resulting HTML
*/
function sh_insertTags(tags, text) {
  var doc = document;

  var result = document.createDocumentFragment();
  var tagIndex = 0;
  var numTags = tags.length;
  var textPos = 0;
  var textLength = text.length;
  var currentNode = result;

  // output one tag or text node every iteration
  while (textPos < textLength || tagIndex < numTags) {
    var tag;
    var tagPos;
    if (tagIndex < numTags) {
      tag = tags[tagIndex];
      tagPos = tag.pos;
    }
    else {
      tagPos = textLength;
    }

    if (tagPos <= textPos) {
      // output the tag
      if (tag.node) {
        // start tag
        var newNode = tag.node;
        currentNode.appendChild(newNode);
        currentNode = newNode;
      }
      else {
        // end tag
        currentNode = currentNode.parentNode;
      }
      tagIndex++;
    }
    else {
      // output text
      currentNode.appendChild(doc.createTextNode(text.substring(textPos, tagPos)));
      textPos = tagPos;
    }
  }

  return result;
}

/**
Highlights an element containing source code.  Upon completion of this function,
the element will have been placed in the "sh_sourceCode" class.
@param  element  a DOM <pre> element containing the source code to be highlighted
@param  language  a language definition object
*/
function sh_highlightElement(element, language) {
  sh_addClass(element, 'sh_sourceCode');
  var originalTags = [];
  var inputString = sh_extractTags(element, originalTags);
  var highlightTags = sh_highlightString(inputString, language);
  var tags = sh_mergeTags(originalTags, highlightTags);
  var documentFragment = sh_insertTags(tags, inputString);
  while (element.hasChildNodes()) {
    element.removeChild(element.firstChild);
  }
  element.appendChild(documentFragment);
}

function sh_getXMLHttpRequest() {
  if (window.ActiveXObject) {
    return new ActiveXObject('Msxml2.XMLHTTP');
  }
  else if (window.XMLHttpRequest) {
    return new XMLHttpRequest();
  }
  throw 'No XMLHttpRequest implementation available';
}

function sh_load(language, element, prefix, suffix) {
  if (language in sh_requests) {
    sh_requests[language].push(element);
    return;
  }
  sh_requests[language] = [element];
  var request = sh_getXMLHttpRequest();
  var url = prefix + 'sh_' + language + suffix;
  request.open('GET', url, true);
  request.onreadystatechange = function () {
    if (request.readyState === 4) {
      try {
        if (! request.status || request.status === 200) {
          eval(request.responseText);
          var elements = sh_requests[language];
          for (var i = 0; i < elements.length; i++) {
            sh_highlightElement(elements[i], sh_languages[language]);
          }
        }
        else {
          throw 'HTTP error: status ' + request.status;
        }
      }
      finally {
        request = null;
      }
    }
  };
  request.send(null);
}

/**
Highlights all elements containing source code on the current page. Elements
containing source code must be "pre" elements with a "class" attribute of
"sh_LANGUAGE", where LANGUAGE is a valid language identifier; e.g., "sh_java"
identifies the element as containing "java" language source code.
*/
function sh_highlightDocument(prefix, suffix) {
  var nodeList = document.getElementsByTagName('pre');
  for (var i = 0; i < nodeList.length; i++) {
    var element = nodeList.item(i);
    var htmlClasses = sh_getClasses(element);
    for (var j = 0; j < htmlClasses.length; j++) {
      var htmlClass = htmlClasses[j].toLowerCase();
      if (htmlClass === 'sh_sourcecode') {
        continue;
      }
      if (htmlClass.substr(0, 3) === 'sh_') {
        var language = htmlClass.substring(3);
        if (language in sh_languages) {
          sh_highlightElement(element, sh_languages[language]);
        }
        else if (typeof(prefix) === 'string' && typeof(suffix) === 'string') {
          sh_load(language, element, prefix, suffix);
        }
        else {
          throw 'Found <pre> element with class="' + htmlClass + '", but no such language exists';
        }
        break;
      }
    }
  }
}

/**********
 javascript
***********/

if (! this.sh_languages) {
  this.sh_languages = {};
}
sh_languages['javascript'] = [
  [
    [
      /\/\/\//g,
      'sh_comment',
      1
    ],
    [
      /\/\//g,
      'sh_comment',
      7
    ],
    [
      /\/\*\*/g,
      'sh_comment',
      8
    ],
    [
      /\/\*/g,
      'sh_comment',
      9
    ],
    [
      /\b(?:abstract|break|case|catch|class|const|continue|debugger|default|delete|do|else|enum|export|extends|false|final|finally|for|function|goto|if|implements|in|instanceof|interface|let|native|new|null|private|protected|prototype|public|return|static|super|switch|synchronized|throw|throws|this|transient|true|try|typeof|var|volatile|while|with)\b/g,
      'sh_keyword',
      -1
    ],
    [
      /(\+\+|--|\)|\])(\s*)(\/=?(?![*\/]))/g,
      ['sh_symbol', 'sh_normal', 'sh_symbol'],
      -1
    ],
    [
      /(0x[A-Fa-f0-9]+|(?:[\d]*\.)?[\d]+(?:[eE][+-]?[\d]+)?)(\s*)(\/(?![*\/]))/g,
      ['sh_number', 'sh_normal', 'sh_symbol'],
      -1
    ],
    [
      /([A-Za-z$_][A-Za-z0-9$_]*\s*)(\/=?(?![*\/]))/g,
      ['sh_normal', 'sh_symbol'],
      -1
    ],
    [
      /\/(?:\\.|[^*\\\/])(?:\\.|[^\\\/])*\/[gim]*/g,
      'sh_regexp',
      -1
    ],
    [
      /\b[+-]?(?:(?:0x[A-Fa-f0-9]+)|(?:(?:[\d]*\.)?[\d]+(?:[eE][+-]?[\d]+)?))u?(?:(?:int(?:8|16|32|64))|L)?\b/g,
      'sh_number',
      -1
    ],
    [
      /"/g,
      'sh_string',
      10
    ],
    [
      /'/g,
      'sh_string',
      11
    ],
    [
      /~|!|%|\^|\*|\(|\)|-|\+|=|\[|\]|\\|:|;|,|\.|\/|\?|&|<|>|\|/g,
      'sh_symbol',
      -1
    ],
    [
      /\{|\}/g,
      'sh_cbracket',
      -1
    ],
    [
      /\b(?:Math|Infinity|NaN|undefined|arguments)\b/g,
      'sh_predef_var',
      -1
    ],
    [
      /\b(?:Array|Boolean|Date|Error|EvalError|Function|Number|Object|RangeError|ReferenceError|RegExp|String|SyntaxError|TypeError|URIError|decodeURI|decodeURIComponent|encodeURI|encodeURIComponent|eval|isFinite|isNaN|parseFloat|parseInt)\b/g,
      'sh_predef_func',
      -1
    ],
    [
      /(?:[A-Za-z]|_)[A-Za-z0-9_]*(?=[ \t]*\()/g,
      'sh_function',
      -1
    ]
  ],
  [
    [
      /$/g,
      null,
      -2
    ],
    [
      /(?:<?)[A-Za-z0-9_\.\/\-_~]+@[A-Za-z0-9_\.\/\-_~]+(?:>?)|(?:<?)[A-Za-z0-9_]+:\/\/[A-Za-z0-9_\.\/\-_~]+(?:>?)/g,
      'sh_url',
      -1
    ],
    [
      /<\?xml/g,
      'sh_preproc',
      2,
      1
    ],
    [
      /<!DOCTYPE/g,
      'sh_preproc',
      4,
      1
    ],
    [
      /<!--/g,
      'sh_comment',
      5
    ],
    [
      /<(?:\/)?[A-Za-z](?:[A-Za-z0-9_:.-]*)(?:\/)?>/g,
      'sh_keyword',
      -1
    ],
    [
      /<(?:\/)?[A-Za-z](?:[A-Za-z0-9_:.-]*)/g,
      'sh_keyword',
      6,
      1
    ],
    [
      /&(?:[A-Za-z0-9]+);/g,
      'sh_preproc',
      -1
    ],
    [
      /<(?:\/)?[A-Za-z][A-Za-z0-9]*(?:\/)?>/g,
      'sh_keyword',
      -1
    ],
    [
      /<(?:\/)?[A-Za-z][A-Za-z0-9]*/g,
      'sh_keyword',
      6,
      1
    ],
    [
      /@[A-Za-z]+/g,
      'sh_type',
      -1
    ],
    [
      /(?:TODO|FIXME|BUG)(?:[:]?)/g,
      'sh_todo',
      -1
    ]
  ],
  [
    [
      /\?>/g,
      'sh_preproc',
      -2
    ],
    [
      /([^=" \t>]+)([ \t]*)(=?)/g,
      ['sh_type', 'sh_normal', 'sh_symbol'],
      -1
    ],
    [
      /"/g,
      'sh_string',
      3
    ]
  ],
  [
    [
      /\\(?:\\|")/g,
      null,
      -1
    ],
    [
      /"/g,
      'sh_string',
      -2
    ]
  ],
  [
    [
      />/g,
      'sh_preproc',
      -2
    ],
    [
      /([^=" \t>]+)([ \t]*)(=?)/g,
      ['sh_type', 'sh_normal', 'sh_symbol'],
      -1
    ],
    [
      /"/g,
      'sh_string',
      3
    ]
  ],
  [
    [
      /-->/g,
      'sh_comment',
      -2
    ],
    [
      /<!--/g,
      'sh_comment',
      5
    ]
  ],
  [
    [
      /(?:\/)?>/g,
      'sh_keyword',
      -2
    ],
    [
      /([^=" \t>]+)([ \t]*)(=?)/g,
      ['sh_type', 'sh_normal', 'sh_symbol'],
      -1
    ],
    [
      /"/g,
      'sh_string',
      3
    ]
  ],
  [
    [
      /$/g,
      null,
      -2
    ]
  ],
  [
    [
      /\*\//g,
      'sh_comment',
      -2
    ],
    [
      /(?:<?)[A-Za-z0-9_\.\/\-_~]+@[A-Za-z0-9_\.\/\-_~]+(?:>?)|(?:<?)[A-Za-z0-9_]+:\/\/[A-Za-z0-9_\.\/\-_~]+(?:>?)/g,
      'sh_url',
      -1
    ],
    [
      /<\?xml/g,
      'sh_preproc',
      2,
      1
    ],
    [
      /<!DOCTYPE/g,
      'sh_preproc',
      4,
      1
    ],
    [
      /<!--/g,
      'sh_comment',
      5
    ],
    [
      /<(?:\/)?[A-Za-z](?:[A-Za-z0-9_:.-]*)(?:\/)?>/g,
      'sh_keyword',
      -1
    ],
    [
      /<(?:\/)?[A-Za-z](?:[A-Za-z0-9_:.-]*)/g,
      'sh_keyword',
      6,
      1
    ],
    [
      /&(?:[A-Za-z0-9]+);/g,
      'sh_preproc',
      -1
    ],
    [
      /<(?:\/)?[A-Za-z][A-Za-z0-9]*(?:\/)?>/g,
      'sh_keyword',
      -1
    ],
    [
      /<(?:\/)?[A-Za-z][A-Za-z0-9]*/g,
      'sh_keyword',
      6,
      1
    ],
    [
      /@[A-Za-z]+/g,
      'sh_type',
      -1
    ],
    [
      /(?:TODO|FIXME|BUG)(?:[:]?)/g,
      'sh_todo',
      -1
    ]
  ],
  [
    [
      /\*\//g,
      'sh_comment',
      -2
    ],
    [
      /(?:<?)[A-Za-z0-9_\.\/\-_~]+@[A-Za-z0-9_\.\/\-_~]+(?:>?)|(?:<?)[A-Za-z0-9_]+:\/\/[A-Za-z0-9_\.\/\-_~]+(?:>?)/g,
      'sh_url',
      -1
    ],
    [
      /(?:TODO|FIXME|BUG)(?:[:]?)/g,
      'sh_todo',
      -1
    ]
  ],
  [
    [
      /"/g,
      'sh_string',
      -2
    ],
    [
      /\\./g,
      'sh_specialchar',
      -1
    ]
  ],
  [
    [
      /'/g,
      'sh_string',
      -2
    ],
    [
      /\\./g,
      'sh_specialchar',
      -1
    ]
  ]
];

/******
 html
*******/

if (! this.sh_languages) {
  this.sh_languages = {};
}
sh_languages['html'] = [
  [
    [
      /<\?xml/g,
      'sh_preproc',
      1,
      1
    ],
    [
      /<!DOCTYPE/g,
      'sh_preproc',
      3,
      1
    ],
    [
      /<!--/g,
      'sh_comment',
      4
    ],
    [
      /<(?:\/)?[A-Za-z](?:[A-Za-z0-9_:.-]*)(?:\/)?>/g,
      'sh_keyword',
      -1
    ],
    [
      /<(?:\/)?[A-Za-z](?:[A-Za-z0-9_:.-]*)/g,
      'sh_keyword',
      5,
      1
    ],
    [
      /&(?:[A-Za-z0-9]+);/g,
      'sh_preproc',
      -1
    ],
    [
      /<(?:\/)?[A-Za-z][A-Za-z0-9]*(?:\/)?>/g,
      'sh_keyword',
      -1
    ],
    [
      /<(?:\/)?[A-Za-z][A-Za-z0-9]*/g,
      'sh_keyword',
      5,
      1
    ]
  ],
  [
    [
      /\?>/g,
      'sh_preproc',
      -2
    ],
    [
      /([^=" \t>]+)([ \t]*)(=?)/g,
      ['sh_type', 'sh_normal', 'sh_symbol'],
      -1
    ],
    [
      /"/g,
      'sh_string',
      2
    ]
  ],
  [
    [
      /\\(?:\\|")/g,
      null,
      -1
    ],
    [
      /"/g,
      'sh_string',
      -2
    ]
  ],
  [
    [
      />/g,
      'sh_preproc',
      -2
    ],
    [
      /([^=" \t>]+)([ \t]*)(=?)/g,
      ['sh_type', 'sh_normal', 'sh_symbol'],
      -1
    ],
    [
      /"/g,
      'sh_string',
      2
    ]
  ],
  [
    [
      /-->/g,
      'sh_comment',
      -2
    ],
    [
      /<!--/g,
      'sh_comment',
      4
    ]
  ],
  [
    [
      /(?:\/)?>/g,
      'sh_keyword',
      -2
    ],
    [
      /([^=" \t>]+)([ \t]*)(=?)/g,
      ['sh_type', 'sh_normal', 'sh_symbol'],
      -1
    ],
    [
      /"/g,
      'sh_string',
      2
    ]
  ]
];

/******
 css
*******/

if (! this.sh_languages) {
  this.sh_languages = {};
}
sh_languages['css'] = [
  [
    [
      /\/\/\//g,
      'sh_comment',
      1
    ],
    [
      /\/\//g,
      'sh_comment',
      7
    ],
    [
      /\/\*\*/g,
      'sh_comment',
      8
    ],
    [
      /\/\*/g,
      'sh_comment',
      9
    ],
    [
      /(?:\.|#)[A-Za-z0-9_]+/g,
      'sh_selector',
      -1
    ],
    [
      /\{/g,
      'sh_cbracket',
      10,
      1
    ],
    [
      /~|!|%|\^|\*|\(|\)|-|\+|=|\[|\]|\\|:|;|,|\.|\/|\?|&|<|>|\|/g,
      'sh_symbol',
      -1
    ]
  ],
  [
    [
      /$/g,
      null,
      -2
    ],
    [
      /(?:<?)[A-Za-z0-9_\.\/\-_~]+@[A-Za-z0-9_\.\/\-_~]+(?:>?)|(?:<?)[A-Za-z0-9_]+:\/\/[A-Za-z0-9_\.\/\-_~]+(?:>?)/g,
      'sh_url',
      -1
    ],
    [
      /<\?xml/g,
      'sh_preproc',
      2,
      1
    ],
    [
      /<!DOCTYPE/g,
      'sh_preproc',
      4,
      1
    ],
    [
      /<!--/g,
      'sh_comment',
      5
    ],
    [
      /<(?:\/)?[A-Za-z](?:[A-Za-z0-9_:.-]*)(?:\/)?>/g,
      'sh_keyword',
      -1
    ],
    [
      /<(?:\/)?[A-Za-z](?:[A-Za-z0-9_:.-]*)/g,
      'sh_keyword',
      6,
      1
    ],
    [
      /&(?:[A-Za-z0-9]+);/g,
      'sh_preproc',
      -1
    ],
    [
      /<(?:\/)?[A-Za-z][A-Za-z0-9]*(?:\/)?>/g,
      'sh_keyword',
      -1
    ],
    [
      /<(?:\/)?[A-Za-z][A-Za-z0-9]*/g,
      'sh_keyword',
      6,
      1
    ],
    [
      /@[A-Za-z]+/g,
      'sh_type',
      -1
    ],
    [
      /(?:TODO|FIXME|BUG)(?:[:]?)/g,
      'sh_todo',
      -1
    ]
  ],
  [
    [
      /\?>/g,
      'sh_preproc',
      -2
    ],
    [
      /([^=" \t>]+)([ \t]*)(=?)/g,
      ['sh_type', 'sh_normal', 'sh_symbol'],
      -1
    ],
    [
      /"/g,
      'sh_string',
      3
    ]
  ],
  [
    [
      /\\(?:\\|")/g,
      null,
      -1
    ],
    [
      /"/g,
      'sh_string',
      -2
    ]
  ],
  [
    [
      />/g,
      'sh_preproc',
      -2
    ],
    [
      /([^=" \t>]+)([ \t]*)(=?)/g,
      ['sh_type', 'sh_normal', 'sh_symbol'],
      -1
    ],
    [
      /"/g,
      'sh_string',
      3
    ]
  ],
  [
    [
      /-->/g,
      'sh_comment',
      -2
    ],
    [
      /<!--/g,
      'sh_comment',
      5
    ]
  ],
  [
    [
      /(?:\/)?>/g,
      'sh_keyword',
      -2
    ],
    [
      /([^=" \t>]+)([ \t]*)(=?)/g,
      ['sh_type', 'sh_normal', 'sh_symbol'],
      -1
    ],
    [
      /"/g,
      'sh_string',
      3
    ]
  ],
  [
    [
      /$/g,
      null,
      -2
    ]
  ],
  [
    [
      /\*\//g,
      'sh_comment',
      -2
    ],
    [
      /(?:<?)[A-Za-z0-9_\.\/\-_~]+@[A-Za-z0-9_\.\/\-_~]+(?:>?)|(?:<?)[A-Za-z0-9_]+:\/\/[A-Za-z0-9_\.\/\-_~]+(?:>?)/g,
      'sh_url',
      -1
    ],
    [
      /<\?xml/g,
      'sh_preproc',
      2,
      1
    ],
    [
      /<!DOCTYPE/g,
      'sh_preproc',
      4,
      1
    ],
    [
      /<!--/g,
      'sh_comment',
      5
    ],
    [
      /<(?:\/)?[A-Za-z](?:[A-Za-z0-9_:.-]*)(?:\/)?>/g,
      'sh_keyword',
      -1
    ],
    [
      /<(?:\/)?[A-Za-z](?:[A-Za-z0-9_:.-]*)/g,
      'sh_keyword',
      6,
      1
    ],
    [
      /&(?:[A-Za-z0-9]+);/g,
      'sh_preproc',
      -1
    ],
    [
      /<(?:\/)?[A-Za-z][A-Za-z0-9]*(?:\/)?>/g,
      'sh_keyword',
      -1
    ],
    [
      /<(?:\/)?[A-Za-z][A-Za-z0-9]*/g,
      'sh_keyword',
      6,
      1
    ],
    [
      /@[A-Za-z]+/g,
      'sh_type',
      -1
    ],
    [
      /(?:TODO|FIXME|BUG)(?:[:]?)/g,
      'sh_todo',
      -1
    ]
  ],
  [
    [
      /\*\//g,
      'sh_comment',
      -2
    ],
    [
      /(?:<?)[A-Za-z0-9_\.\/\-_~]+@[A-Za-z0-9_\.\/\-_~]+(?:>?)|(?:<?)[A-Za-z0-9_]+:\/\/[A-Za-z0-9_\.\/\-_~]+(?:>?)/g,
      'sh_url',
      -1
    ],
    [
      /(?:TODO|FIXME|BUG)(?:[:]?)/g,
      'sh_todo',
      -1
    ]
  ],
  [
    [
      /\}/g,
      'sh_cbracket',
      -2
    ],
    [
      /\/\/\//g,
      'sh_comment',
      1
    ],
    [
      /\/\//g,
      'sh_comment',
      7
    ],
    [
      /\/\*\*/g,
      'sh_comment',
      8
    ],
    [
      /\/\*/g,
      'sh_comment',
      9
    ],
    [
      /[A-Za-z0-9_-]+[ \t]*:/g,
      'sh_property',
      -1
    ],
    [
      /[.%A-Za-z0-9_-]+/g,
      'sh_value',
      -1
    ],
    [
      /#(?:[A-Za-z0-9_]+)/g,
      'sh_string',
      -1
    ]
  ]
];

/******
 sh
*******/

if (! this.sh_languages) {
  this.sh_languages = {};
}
sh_languages['sh'] = [
  [
    [
      /\b(?:import)\b/g,
      'sh_preproc',
      -1
    ],
    [
      /\b[+-]?(?:(?:0x[A-Fa-f0-9]+)|(?:(?:[\d]*\.)?[\d]+(?:[eE][+-]?[\d]+)?))u?(?:(?:int(?:8|16|32|64))|L)?\b/g,
      'sh_number',
      -1
    ],
    [
      /\\"|\\'/g,
      'sh_normal',
      -1
    ],
    [
      /"/g,
      'sh_string',
      1
    ],
    [
      /'/g,
      'sh_string',
      2
    ],
    [
      /function[ \t]+(?:[A-Za-z]|_)[A-Za-z0-9_]*[ \t]*(?:\(\))?|(?:[A-Za-z]|_)[A-Za-z0-9_]*[ \t]*\(\)/g,
      'sh_function',
      -1
    ],
    [
      /(?:[A-Za-z]*[-\/]+[A-Za-z]+)+/g,
      'sh_normal',
      -1
    ],
    [
      /\b(?:alias|bg|bind|break|builtin|caller|case|command|compgen|complete|continue|declare|dirs|disown|do|done|elif|else|enable|esac|eval|exec|exit|export|false|fc|fg|fi|for|getopts|hash|help|history|if|in|jobs|let|local|logout|popd|printf|pushd|read|readonly|return|select|set|shift|shopt|source|suspend|test|then|times|trap|true|type|typeset|umask|unalias|unset|until|wait|while)\b/g,
      'sh_keyword',
      -1
    ],
    [
      /(?:[A-Za-z]|_)[A-Za-z0-9_]*(?==)|\$\{(?:[^ \t]+)\}|\$\((?:[^ \t]+)\)|\$(?:[A-Za-z]|_)[A-Za-z0-9_]*|\$(?:[^ \t]{1})/g,
      'sh_variable',
      -1
    ],
    [
      /~|!|%|\^|\*|\(|\)|\+|=|\[|\]|\\|:|;|,|\.|\/|\?|&|<|>|\||%%|(?:##){2}(?!#)/g,
      'sh_symbol',
      -1
    ],
    [
      /#/g,
      'sh_comment',
      3
    ]
  ],
  [
    [
      /"/g,
      'sh_string',
      -2
    ],
    [
      /\\./g,
      'sh_specialchar',
      -1
    ]
  ],
  [
    [
      /'/g,
      'sh_string',
      -2
    ],
    [
      /\\./g,
      'sh_specialchar',
      -1
    ]
  ],
  [
    [
      /$/g,
      null,
      -2
    ]
  ]
];

/******
 perl
*******/
if (! this.sh_languages) {
  this.sh_languages = {};
}
sh_languages['perl'] = [
  [
    [
      /\b(?:import)\b/g,
      'sh_preproc',
      -1
    ],
    [
      /(s)(\{(?:\\\}|[^}])*\}\{(?:\\\}|[^}])*\})([ixsmogce]*)/g,
      ['sh_keyword', 'sh_regexp', 'sh_keyword'],
      -1
    ],
    [
      /(s)(\((?:\\\)|[^)])*\)\((?:\\\)|[^)])*\))([ixsmogce]*)/g,
      ['sh_keyword', 'sh_regexp', 'sh_keyword'],
      -1
    ],
    [
      /(s)(\[(?:\\\]|[^\]])*\]\[(?:\\\]|[^\]])*\])([ixsmogce]*)/g,
      ['sh_keyword', 'sh_regexp', 'sh_keyword'],
      -1
    ],
    [
      /(s)(<.*><.*>)([ixsmogce]*)/g,
      ['sh_keyword', 'sh_regexp', 'sh_keyword'],
      -1
    ],
    [
      /(q(?:q?))(\{(?:\\\}|[^}])*\})/g,
      ['sh_keyword', 'sh_string'],
      -1
    ],
    [
      /(q(?:q?))(\((?:\\\)|[^)])*\))/g,
      ['sh_keyword', 'sh_string'],
      -1
    ],
    [
      /(q(?:q?))(\[(?:\\\]|[^\]])*\])/g,
      ['sh_keyword', 'sh_string'],
      -1
    ],
    [
      /(q(?:q?))(<.*>)/g,
      ['sh_keyword', 'sh_string'],
      -1
    ],
    [
      /(q(?:q?))([^A-Za-z0-9 \t])(.*\2)/g,
      ['sh_keyword', 'sh_string', 'sh_string'],
      -1
    ],
    [
      /(s)([^A-Za-z0-9 \t])(.*\2.*\2)([ixsmogce]*(?=[ \t]*(?:\)|;)))/g,
      ['sh_keyword', 'sh_regexp', 'sh_regexp', 'sh_keyword'],
      -1
    ],
    [
      /(s)([^A-Za-z0-9 \t])(.*\2[ \t]*)([^A-Za-z0-9 \t])(.*\4)([ixsmogce]*(?=[ \t]*(?:\)|;)))/g,
      ['sh_keyword', 'sh_regexp', 'sh_regexp', 'sh_regexp', 'sh_regexp', 'sh_keyword'],
      -1
    ],
    [
      /#/g,
      'sh_comment',
      1
    ],
    [
      /\b[+-]?(?:(?:0x[A-Fa-f0-9]+)|(?:(?:[\d]*\.)?[\d]+(?:[eE][+-]?[\d]+)?))u?(?:(?:int(?:8|16|32|64))|L)?\b/g,
      'sh_number',
      -1
    ],
    [
      /(?:m|qr)(?=\{)/g,
      'sh_keyword',
      2
    ],
    [
      /(?:m|qr)(?=#)/g,
      'sh_keyword',
      4
    ],
    [
      /(?:m|qr)(?=\|)/g,
      'sh_keyword',
      6
    ],
    [
      /(?:m|qr)(?=@)/g,
      'sh_keyword',
      8
    ],
    [
      /(?:m|qr)(?=<)/g,
      'sh_keyword',
      10
    ],
    [
      /(?:m|qr)(?=\[)/g,
      'sh_keyword',
      12
    ],
    [
      /(?:m|qr)(?=\\)/g,
      'sh_keyword',
      14
    ],
    [
      /(?:m|qr)(?=\/)/g,
      'sh_keyword',
      16
    ],
    [
      /"/g,
      'sh_string',
      18
    ],
    [
      /'/g,
      'sh_string',
      19
    ],
    [
      /</g,
      'sh_string',
      20
    ],
    [
      /\/[^\n]*\//g,
      'sh_string',
      -1
    ],
    [
      /\b(?:chomp|chop|chr|crypt|hex|i|index|lc|lcfirst|length|oct|ord|pack|q|qq|reverse|rindex|sprintf|substr|tr|uc|ucfirst|m|s|g|qw|abs|atan2|cos|exp|hex|int|log|oct|rand|sin|sqrt|srand|my|local|our|delete|each|exists|keys|values|pack|read|syscall|sysread|syswrite|unpack|vec|undef|unless|return|length|grep|sort|caller|continue|dump|eval|exit|goto|last|next|redo|sub|wantarray|pop|push|shift|splice|unshift|split|switch|join|defined|foreach|last|chop|chomp|bless|dbmclose|dbmopen|ref|tie|tied|untie|while|next|map|eq|die|cmp|lc|uc|and|do|if|else|elsif|for|use|require|package|import|chdir|chmod|chown|chroot|fcntl|glob|ioctl|link|lstat|mkdir|open|opendir|readlink|rename|rmdir|stat|symlink|umask|unlink|utime|binmode|close|closedir|dbmclose|dbmopen|die|eof|fileno|flock|format|getc|print|printf|read|readdir|rewinddir|seek|seekdir|select|syscall|sysread|sysseek|syswrite|tell|telldir|truncate|warn|write|alarm|exec|fork|getpgrp|getppid|getpriority|kill|pipe|qx|setpgrp|setpriority|sleep|system|times|x|wait|waitpid)\b/g,
      'sh_keyword',
      -1
    ],
    [
      /^\=(?:head1|head2|item)/g,
      'sh_comment',
      21
    ],
    [
      /(?:\$[#]?|@|%)[\/A-Za-z0-9_]+/g,
      'sh_variable',
      -1
    ],
    [
      /~|!|%|\^|\*|\(|\)|-|\+|=|\[|\]|\\|:|;|,|\.|\/|\?|&|<|>|\|/g,
      'sh_symbol',
      -1
    ],
    [
      /\{|\}/g,
      'sh_cbracket',
      -1
    ],
    [
      /(?:[A-Za-z]|_)[A-Za-z0-9_]*(?=[ \t]*\()/g,
      'sh_function',
      -1
    ]
  ],
  [
    [
      /$/g,
      null,
      -2
    ]
  ],
  [
    [
      /\{/g,
      'sh_regexp',
      3
    ]
  ],
  [
    [
      /[ \t]+#.*/g,
      'sh_comment',
      -1
    ],
    [
      /\$(?:[A-Za-z0-9_]+|\{[A-Za-z0-9_]+\})/g,
      'sh_variable',
      -1
    ],
    [
      /\\\{|\\\}|\}/g,
      'sh_regexp',
      -3
    ]
  ],
  [
    [
      /#/g,
      'sh_regexp',
      5
    ]
  ],
  [
    [
      /[ \t]+#.*/g,
      'sh_comment',
      -1
    ],
    [
      /\$(?:[A-Za-z0-9_]+|\{[A-Za-z0-9_]+\})/g,
      'sh_variable',
      -1
    ],
    [
      /\\#|#/g,
      'sh_regexp',
      -3
    ]
  ],
  [
    [
      /\|/g,
      'sh_regexp',
      7
    ]
  ],
  [
    [
      /[ \t]+#.*/g,
      'sh_comment',
      -1
    ],
    [
      /\$(?:[A-Za-z0-9_]+|\{[A-Za-z0-9_]+\})/g,
      'sh_variable',
      -1
    ],
    [
      /\\\||\|/g,
      'sh_regexp',
      -3
    ]
  ],
  [
    [
      /@/g,
      'sh_regexp',
      9
    ]
  ],
  [
    [
      /[ \t]+#.*/g,
      'sh_comment',
      -1
    ],
    [
      /\$(?:[A-Za-z0-9_]+|\{[A-Za-z0-9_]+\})/g,
      'sh_variable',
      -1
    ],
    [
      /\\@|@/g,
      'sh_regexp',
      -3
    ]
  ],
  [
    [
      /</g,
      'sh_regexp',
      11
    ]
  ],
  [
    [
      /[ \t]+#.*/g,
      'sh_comment',
      -1
    ],
    [
      /\$(?:[A-Za-z0-9_]+|\{[A-Za-z0-9_]+\})/g,
      'sh_variable',
      -1
    ],
    [
      /\\<|\\>|>/g,
      'sh_regexp',
      -3
    ]
  ],
  [
    [
      /\[/g,
      'sh_regexp',
      13
    ]
  ],
  [
    [
      /[ \t]+#.*/g,
      'sh_comment',
      -1
    ],
    [
      /\$(?:[A-Za-z0-9_]+|\{[A-Za-z0-9_]+\})/g,
      'sh_variable',
      -1
    ],
    [
      /\\]|\]/g,
      'sh_regexp',
      -3
    ]
  ],
  [
    [
      /\\/g,
      'sh_regexp',
      15
    ]
  ],
  [
    [
      /[ \t]+#.*/g,
      'sh_comment',
      -1
    ],
    [
      /\$(?:[A-Za-z0-9_]+|\{[A-Za-z0-9_]+\})/g,
      'sh_variable',
      -1
    ],
    [
      /\\\\|\\/g,
      'sh_regexp',
      -3
    ]
  ],
  [
    [
      /\//g,
      'sh_regexp',
      17
    ]
  ],
  [
    [
      /[ \t]+#.*/g,
      'sh_comment',
      -1
    ],
    [
      /\$(?:[A-Za-z0-9_]+|\{[A-Za-z0-9_]+\})/g,
      'sh_variable',
      -1
    ],
    [
      /\\\/|\//g,
      'sh_regexp',
      -3
    ]
  ],
  [
    [
      /$/g,
      null,
      -2
    ],
    [
      /\\(?:\\|")/g,
      null,
      -1
    ],
    [
      /"/g,
      'sh_string',
      -2
    ]
  ],
  [
    [
      /$/g,
      null,
      -2
    ],
    [
      /\\(?:\\|')/g,
      null,
      -1
    ],
    [
      /'/g,
      'sh_string',
      -2
    ]
  ],
  [
    [
      /$/g,
      null,
      -2
    ],
    [
      />/g,
      'sh_string',
      -2
    ]
  ],
  [
    [
      /\=cut/g,
      'sh_comment',
      -2
    ]
  ]
];

/*************
 line numbers
*************/

function addLineClass (pre) {
	if (pre.classList.contains('sh')){
		let lines = pre.innerHTML.split('*!*');
		if (lines.length > 1) {
			pre.innerHTML="";
			for(let i = 0; i < lines.length; i++) {
				if(lines[i].length > 1) {
					let sp = document.createElement("span");
					sp.className = "highlight";
					pre.appendChild(sp);
					let arr = lines[i].split('\n');
					for (let j = 1; j < arr.indexOf("*/!*"); j++) {
						let span = document.createElement("span");
						span.className = "line";
						span.innerHTML = arr[j];
						sp.appendChild(span);
						sp.appendChild(document.createTextNode("\n"));
					}
					for (let j = arr.indexOf("*/!*")+1; j < arr.length-1; j++) {
						let span = document.createElement("span");
						span.className = "line";
						span.innerHTML = arr[j];
						pre.appendChild(span);
						pre.appendChild(document.createTextNode("\n"));
					}
				}
			}
		} else {
			lines = lines.toString().split('\n');
			pre.innerHTML="";
			for(let i = 0; i < lines.length-1; i++) {
				let span = document.createElement("span");
				span.className = "line";
				span.innerHTML = lines[i];
				pre.appendChild(span);
				pre.appendChild(document.createTextNode("\n"));
			}
		}
	}
}

/*************
 event listner
**************/

window.addEventListener("load", function () {

	let pres = document.getElementsByTagName("pre");

	for (let i = 0; i < pres.length; i++) {
		addLineClass(pres[i]);
		if (pres[i].classList.contains("js")) {
			pres[i].classList.add('sh_javascript');
		}
		if (pres[i].classList.contains("html")) {
			pres[i].classList.add('sh_html');
		}
		if (pres[i].classList.contains("css")) {
			pres[i].classList.add('sh_css');
		}
		if (pres[i].classList.contains("sh")) {
			pres[i].classList.add('sh_sh');
		}
		if (pres[i].classList.contains("perl")) {
			pres[i].classList.add('sh_perl');
		}
	}

	/*const elements = document.querySelectorAll('.js');
	elements.forEach((element) => {
		element.classList.add('sh_javascript');
	});*/

	sh_highlightDocument()
}, 

false
);
