const DIST_MODE = process.argv[process.argv.length - 1] == 'dist';

/* Dependencies */
const gulp = require('gulp');
const gutil = require('gulp-util');
const plumber = require('gulp-plumber');
const autoprefixer = require('gulp-autoprefixer');
const gulp-file-include = require('gulp-file-include');
const sass = require('gulp-sass');


const paths = {
  css: {
    src: 'src/sass/**/*.scss',
    dest: 'dist/'
  },
  html: {
    src: 'src/*.*',
    dest: 'dist/'
  },
  images: {
    src: 'src/img/**/*',
    dest: 'dist/img'
  }  
};

function buildPages() {

}

function buildStyles() {
  return gulp.src(paths.css.src)
    .pipe(plumber())
    .pipe(sass(DIST_MODE ? { outputStyle: 'compressed' } : {}))
    .pipe(autoprefixer({ browsers: ['> 10%'] }))
    .pipe(gulp.dest(paths.css.dest));
}

function buildImages() {
  return gulp.src(paths.images.src)
    .pipe(gulp.dest(paths.images.dest));
}