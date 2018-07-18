
/* Dependencies */
const gulp = require('gulp');
const plumber = require('gulp-plumber');
const autoprefixer = require('gulp-autoprefixer');
const fileinclude = require('gulp-file-include');
const sass = require('gulp-sass');
const filter = require('gulp-filter')
const minimist = require('minimist');
const del = require('del');
const gulpAmpValidator = require('gulp-amphtml-validator');
const bs = require('browser-sync').create();
const amphtmlValidator = require('amphtml-validator');
const through = require('through2');
const jsdom = require('jsdom');
const reload = bs.reload;

const { JSDOM } = jsdom;
const AMP_BASE_URL_ELEMENT = '<script async src="https://cdn.ampproject.org/v0.js"></script>';
const AMP_PLACEHOLDER = '${ampjs}';

// Build type is configurable such that some options can be changed e.g. whether
// to minimise CSS. Usage 'gulp <task> --env development'.
const knownOptions = {
  string: 'env',
  default: { env: process.env.NODE_ENV || 'dist' }
};

const options = minimist(process.argv.slice(2), knownOptions);

const paths = {
  css: {
    src: 'src/sass/**/*.scss',
    dest: 'src/css/'
  },
  html: {
    src: 'src/html/pages/*.html',
    dest: 'dist/'
  },
  images: {
    src: 'src/img/**/*.{gif,jpg,png,svg}',
    dest: 'dist/img'
  }  
};

const scriptUrlCache = {};

/**
 * Builds the styles, bases on SASS files taken from src. The resulting CSS is
 * used as partials that are included in the final AMP HTML.
 */
gulp.task('styles', function buildStyles() {
  return gulp.src(paths.css.src)
    .pipe(plumber())
    .pipe(sass(options.env === 'dist' ? { outputStyle: 'compressed' } : {}))
    .pipe(autoprefixer({ browsers: ['> 10%'] }))
    .pipe(gulp.dest(paths.css.dest));
});

/**
 * Copies the images to the distribution.
 */
gulp.task('images', function buildImages() {
  return gulp.src(paths.images.src)
    .pipe(gulp.dest(paths.images.dest));
});

/**
 * Identifies missing AMP custom-elementscript tags in an AMP HTML file and
 * adds them.
 *
 * This is achieved by:
 * 1. Running the AMP validator and filtering for errors for missing extensions.
 * 2. Retrieving the required <script/> tags from the spec page for each error
 *
 * Whilst scraping the spec page for the <script/> tags may not be seen as ideal
 * it is simpler than parsing the validator proto files, and also ensures that
 * the elements included are exactly as per the documentation.
 *
 * @param {!Vinyl} file The file to add script tags to.
 * @return {!Vinyl} The modified file.
 */
async function addIncludes(file) {
  let instance = await amphtmlValidator.getInstance();
  const inputString = file.contents.toString();
  const result = instance.validateString(inputString);
  if (result.status === 'FAIL') {
    // Filter for only those errors indicating a missing script tag.
    const tagErrors = result.errors
        .filter(err => {
            return err.category === 'MANDATORY_AMP_TAG_MISSING_OR_INCORRECT'
                && err.code === 'MISSING_REQUIRED_EXTENSION'});

    var missingScriptUrls = new Set();
    for (let tagError of tagErrors) {
      const tagName = tagError.params[0];
      // For each missing tag, add the required script URLs to a cache, to avoid
      // fetching them repeatedly.
      if (!scriptUrlCache[tagName]) {
        const dom = await JSDOM.fromURL(tagError.specUrl);
        scriptUrlCache[tagName] = extractScriptUrlsFromDom(tagName, dom);
      }
      missingScriptUrls = new Set([...missingScriptUrls,
        ...scriptUrlCache[tagName]]);
    }
  }
  if (missingScriptUrls.size) {
    return addScriptUrlsToFile(file, missingScriptUrls);
  }
  return file;
}

/**
 * Extracts script tag URLs from the DOM for a given spec page of a custom
 * element.
 *
 * Whilst scraping the spec page may not seem the most robust manner to approach
 * this problem, it is easy to implement, ensures that the script tags match
 * the documentation, allows for custom elements that require multiple script
 * tags, and makes no assumptions about versioning.
 *
 * @param {string} tagName The name of the custom element.
 * @param {JSDOM} dom The DOM for the spec page.
 * @return {Set} A set of script tag URLs, for inclusion on the AMP page.
 * @throws If no script tags are found on the spec page.
 */
function extractScriptUrlsFromDom(tagName, dom) {
  const scriptUrls = new Set();
  const tagRe = /(<script async custom-element="[^"]+" src="[^"]+"><\/script>)/;
  const doc = dom.window.document;
  const codeTags = doc.getElementsByTagName('code');
  for (codeTag of codeTags) {
    const matches = tagRe.exec(codeTag.textContent);
    if (matches) {
      scriptUrls.add(matches[1]);
    }
  }
  if (!scriptUrls.size) {
    throw Error('No script sources found  for ' + tagName);
  }
  return scriptUrls;
}

/**
 * Adds the required script tags to the AMP HTML document.
 *
 * Searches for a ${ampjs} placeholder, and replaces it with:
 * 1. The base AMP JS script element.
 * 2. Any identified custom element script elements.
 *
 * @param {!Vinyl} file The AMP HTML file.
 * @param {!Set} scriptUrls The set of custom element <script> tags.
 * @return {!Vinyl} The modified AMP HTML file.
 * @throws If the placeholder cannot be found in the AMP HTML file.
 */
function addScriptUrlsToFile(file, scriptUrls) {
  const contents = file.contents.toString();
  const [head, tail] = contents.split(AMP_PLACEHOLDER);
  if (!tail) {
    throw Error('Base AMP script element not found');
  }
  const newScriptUrls = [...scriptUrls].join('\n');
  file.contents = Buffer.from([head, AMP_BASE_URL_ELEMENT,
      newScriptUrls, tail].join('\n'));
  return file;
}

/**
 * Creates the include function for use in .pipe()
 *
 * @return {Function} The function for use in gulp.
 */
function includeAmpCustomElements() {
  function runInclude(file, encoding, callback) {
    if (file.isNull()) {
      return callback(null, file);
    }
    if (file.isBuffer()) {
      console.log(file.path);
      addIncludes(file).then((modifiedFile) => {
        return callback(null, modifiedFile);   
      });
    }
  }
  return through.obj(runInclude);
}

/**
 * Builds the HTML files. Only files from 'pages' are built, such that partials
 * are ignored as targets.
 */
gulp.task('html', gulp.series('styles', function buildHtml() {
  const pageFilter = filter(['**/pages/*.html']);

  return gulp.src(paths.html.src)
    .pipe(pageFilter)
    .pipe(fileinclude({
      prefix: '%%',
      basepath: '@file'
    }))
    .pipe(includeAmpCustomElements())
    .pipe(gulp.dest(paths.html.dest));
}));

/**
 * Checks resulting output AMP HTML for validity.
 */
gulp.task('validate', function validate() {
  return gulp.src(paths.html.dest + '/**/*.html')
    .pipe(gulpAmpValidator.validate())
    .pipe(gulpAmpValidator.format())
    .pipe(gulpAmpValidator.failAfterError());
});

/**
 * Removes all files from the distribution directory, and also the CSS build
 * directory.
 */
gulp.task('clean', function clean() {
  return del([
    paths.html.dest + '/**/*',
    paths.css.dest + '/**/*'
  ]);
});

/**
 * Builds the output from sources.
 */
gulp.task('build', gulp.series('images', 'html', 'validate'));

/**
 * First rebuilds the output then triggers a reload of the browser.
 */
gulp.task('rebuild', gulp.series('build', function rebuild(done) {
  bs.reload();
  done();
}));

/**
 * Sets up the live browser sync.
 */
gulp.task('serve', function sync(done) {
    bs.init({
        server: {
            baseDir: 'dist/'
        }
    });
    done();
});

/**
 * Sets up live-reloading: Changes to HTML or CSS trigger a rebuild, changes to
 * images only result in images being copied again to dist.
 */
gulp.task('watch', function watch() {
  gulp.watch(paths.images.src, gulp.series('images'));
  gulp.watch('src/html/**/*.html', gulp.series('rebuild'));
  gulp.watch(paths.css.src, gulp.series('rebuild'));
});

/**
 * Prepares a clean build.
 */
gulp.task('prepare', gulp.series('clean', 'build'));

/**
 * Default task is to perform a clean build then set up browser sync for live
 * reloading.
 */
gulp.task('default', gulp.series('clean', 'build',
  gulp.parallel('serve', 'watch')));