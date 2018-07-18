
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
const reload = bs.reload;
const jsdom = require('jsdom');
const through = require('through2');

const { JSDOM } = jsdom;
const AMP_BASE_URL_ELEMENT = '<script async src="https://cdn.ampproject.org/v0.js"></script>';
const AMP_PLACEHOLDER = '${ampjs}';

const AMP_EXCLUDED_TAGS = new Set(['amp-img']);
const AMP_REMAPPED_TAGS = {'amp-state': 'amp-bind'};

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
 * Adds necessary AMP script tags.
 *
 * Replaces the placeholder '${ampjs}' with the AMP base script and any
 * necessary scripts to support custom elements.
 *
 * @param {!Vinyl} file The file to scan and add tags to.
 * @return {!Vinyl} The modified file.
 */
function addScriptTags(file) {
  const dom = new JSDOM(file.contents.toString());
  const doc = dom.window.document;
  const ampTags = new Set(Array.from(doc.getElementsByTagName('*'))
      .map(e => e.tagName.toLowerCase())
      .filter(t => t.startsWith('amp'))
      .filter(t => !AMP_EXCLUDED_TAGS.has(t))
      .map(t => AMP_REMAPPED_TAGS[t] || t));
  const urls = [AMP_BASE_URL_ELEMENT, ...Array.from(ampTags, t => {
    return `<script async custom-element="${t}" src="https://cdn.ampproject.org/v0/${t}-latest.js"></script>`;
  })];
  file.contents = new Buffer(file.contents.toString().replace(AMP_PLACEHOLDER,
      urls.join('\n')));
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
    } else if (file.isBuffer()) {
      const modifiedFile = addScriptTags(file);
      return callback(null, modifiedFile);   
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