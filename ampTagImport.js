const jsdom = require('jsdom');
const through = require('through2');

const { JSDOM } = jsdom;
const AMP_BASE_URL_ELEMENT = '<script async src="https://cdn.ampproject.org/v0.js"></script>';

// This placeholder should be put in the AMP HTML file in the desired location
// for substitution withe the AMP base <script> tag and any identified
// custom-elements that are required.
const AMP_PLACEHOLDER = '${ampjs}';

// Maintain a set of amp-* tags for which no custom script tag is required.
const AMP_EXCLUDED_TAGS = new Set(['amp-img', 'amp-web-push-widget']);

// Maintain a mapping of custom elements whose JS to include is not of the same
// name. For example, using <amp-state> requires amp-bind JS to be included.
const AMP_REMAPPED_TAGS = {'amp-state': 'amp-bind'};

// Regular expression for identifying use of AMP state within event definitions
// in "on" attributes.
const AMP_BIND_ATTR_REGEX = /AMP\.(setState|pushState)/;

/**
 * Imports the required AMP custom-element script tags into an AMP document.
 */
module.exports.import = function() {
  function runInclude(file, encoding, callback) {
    if (file.isNull()) {
      return callback(null, file);
    } else if (file.isBuffer()) {
      const modifiedFile = addAmpCustomElementTags(file);
      return callback(null, modifiedFile);   
    }
  }
  return through.obj(runInclude);
}

/**
 * Adds necessary AMP script tags.
 *
 * Replaces the placeholder '${ampjs}' with the AMP base script and any
 * necessary scripts to support custom elements.
 *
 * @param {!Vinyl} file The file to scan and add tags to.
 * @return {!Vinyl} The modified file.
 */
function addAmpCustomElementTags(file) {
  const dom = new JSDOM(file.contents.toString());
  const doc = dom.window.document;

  const requiredElements = getRequiredElementsFromTagName(doc);

  // amp-bind can be required where state is being used without any <amp-state>
  // tag. See "A Simple Example "  at https://www.ampproject.org/docs/reference/components/amp-bind
  if (containsAmpStateInAttribute(doc)) {
    requiredElements.add('amp-bind');
  }
  if (containsAmpAccessInAttribute(doc)) {
    requiredElements.add('amp-access');
    requiredElements.add('amp-analytics');
  }
  if (containsAmpAccessLaterpayInAttribute(doc)) {
    requiredElements.add('amp-access-laterpay');
  }

  const urls = [AMP_BASE_URL_ELEMENT,
      ...Array.from(requiredElements, t => createAmpCustomElementTag(t))];
  file.contents = new Buffer(file.contents.toString().replace(AMP_PLACEHOLDER,
      urls.join('\n')));
  return file;
}

/**
 * Identifies which custom-element scripts are required based on the element
 * tag names in the document.
 *
 * @param {JSDOM} doc The DOM for the file.
 * @return A set of required element names.
 */
function getRequiredElementsFromTagName(doc) {
  return new Set(Array.from(doc.getElementsByTagName('*'))
      .map(e => e.tagName.toLowerCase())
      .filter(t => t.startsWith('amp'))
      .filter(t => !AMP_EXCLUDED_TAGS.has(t))
      .map(t => AMP_REMAPPED_TAGS[t] || t));
}

/**
 * Identifies whether amp-state is being used in an attribute without use of
 * an <amp-state> tag, in which case, amp-bind is still required.
 *
 * @param {JSDOM} doc The DOM for the file.
 * @return true if use of amp-state is identified in an "on" attribute.
 */
function containsAmpStateInAttribute(doc) {
  const elements = Array.from(doc.querySelectorAll("[on]"));
  for (let element of elements) {
    const attr = element.getAttribute("on");
    if (AMP_BIND_ATTR_REGEX.exec(attr)) {
      return true;
    }
  }
  return false;
}

/**
 * Identifies whether amp-access is being used in attributes.
 *
 * @param {JSDOM} doc The DOM for the file.
 * @return true if use of amp-access is identified.
 */
function containsAmpAccessInAttribute(doc) {
  return doc.querySelector("[amp-access]")
      || doc.querySelector("script[id='amp-access'");
}

/**
 * Identifies whether amp-access-laterpay is being used in attributes.
 *
 * @param {JSDOM} doc The DOM for the file.
 * @return true if use of amp-access-laterpay is identified.
 */
function containsAmpAccessLaterpayInAttribute(doc) {
  return doc.querySelector("[id='amp-access-laterpay-dialog']");
}

/**
 * Builds a script tag for a custom element.
 * 
 * @param {string} tagName The custom element to include.
 * @return {string} The <script> tag.
 */
function createAmpCustomElementTag(tagName) {
  return `<script async custom-element="${tagName}" ` +
      `src="https://cdn.ampproject.org/v0/${tagName}-latest.js"></script>`;
}