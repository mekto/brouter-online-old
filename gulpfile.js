var gulp = require('gulp'),
    stylus = require('gulp-stylus'),
    livereload = require('gulp-livereload'),
    autoprefixer = require('gulp-autoprefixer'),
    settings = {
      useLiveReload: false
    };


gulp.task('css', function() {
  var task = gulp.src('static/css/app.styl')
    .pipe(stylus())
    .pipe(autoprefixer('last 2 versions'))
    .pipe(gulp.dest('static/css/'));

  if (settings.useLiveReload)
    task.pipe(livereload());
});


gulp.task('devserver', ['config:livereload', 'css'], function() {
  gulp.watch('static/css/*.styl', ['css']);

  run('python', ['brouter.py']);
});


/**
  config tasks
*/
gulp.task('config:livereload', function() {
  settings.useLiveReload = true;
});

/**
   utils
*/
function run(cmd, args) {
  require('child_process').spawn(cmd, args, { stdio: 'inherit' });
}
