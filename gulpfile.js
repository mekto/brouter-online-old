var gulp = require('gulp'),
    stylus = require('gulp-stylus'),
    livereload = require('gulp-livereload'),
    autoprefixer = require('gulp-autoprefixer'),
    browserify = require('gulp-browserify'),
    gutil = require('gulp-util'),
    debug = false;


gulp.task('js', function() {
  gulp.src('static/js/app.js')
    .pipe(browserify({debug: debug}))
      .on('error', gutil.log)
      .on('error', gutil.beep)
    .pipe(gulp.dest('static/build/'));
});


gulp.task('css', function() {
  var task = gulp.src('static/css/app.styl')
    .pipe(stylus({sourcemaps: debug}))
    .pipe(autoprefixer('last 2 versions'))
    .pipe(gulp.dest('static/build/'));

  if (debug)
    task.pipe(livereload());
});


gulp.task('devserver', ['config:debug', 'css', 'js'], function() {
  gulp.watch('static/css/*.styl', ['css']);
  gulp.watch('static/js/**.js', ['js']);

  run('python', ['brouter.py']);
});


/**
  config task
*/
gulp.task('config:debug', function() {
  debug = true;
});

/**
   utils
*/
function run(cmd, args) {
  require('child_process').spawn(cmd, args, {stdio: 'inherit'});
}
