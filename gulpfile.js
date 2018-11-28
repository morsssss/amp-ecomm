
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
const autoScript = require('amphtml-autoscript').create();
const reload = bs.reload;

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
    .pipe(autoScript())
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
gulp.task('watch', function watch(done) {
  gulp.watch(paths.images.src, gulp.series('images'));
  gulp.watch('src/html/**/*.html', gulp.series('rebuild'));
  gulp.watch(paths.css.src, gulp.series('rebuild'));
  done();
});

/**
 * Prepares a clean build.
 */
gulp.task('prepare', gulp.series('clean', 'build'));

/**
 * Default task is to perform a clean build then set up browser sync for live
 * reloading.
 */
gulp.task('default', gulp.series(/* 'clean', */ 'build','serve', 'watch'));