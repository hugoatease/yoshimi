var gulp = require('gulp');
var bower = require('gulp-bower');
var mainBowerFiles = require('main-bower-files');
var less = require('gulp-less');
var minifyCss = require('gulp-minify-css');

gulp.task('default', ['build']);
gulp.task('build', ['styles']);

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
