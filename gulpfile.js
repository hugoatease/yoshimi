var gulp = require('gulp');
var bower = require('gulp-bower');
var mainBowerFiles = require('main-bower-files');
var less = require('gulp-less');
var minifyCss = require('gulp-minify-css');
var browserify = require('browserify');
var reactify = require('reactify');
var source = require('vinyl-source-stream');
var buffer = require('vinyl-buffer');
var uglify = require('gulp-uglify');
var preprocessify = require('preprocessify');
var config = require('config');

gulp.task('default', ['build']);
gulp.task('build', ['app', 'styles']);

gulp.task('app', function() {
  return browserify({
    entries: ['./client/yoshimi.js'],
    transform: [preprocessify({NAME: config.get('name'), PREFIX: config.get('prefix')}), reactify],
    standalone: 'yoshimi'
  }).bundle()
    .pipe(source('yoshimi.js'))
    .pipe(buffer())
    .pipe(uglify())
    .pipe(gulp.dest('static/'));
});

gulp.task('bower', function() {
  return bower();
});

gulp.task('styles', ['bower', 'fonts'], function() {
  return gulp.src('client/styles.less')
    .pipe(less())
    .pipe(minifyCss())
    .pipe(gulp.dest('static/'));
});

gulp.task('fonts', ['bower'], function() {
  return gulp.src(mainBowerFiles('**/fonts/**'))
    .pipe(gulp.dest('static/fonts'));
});
