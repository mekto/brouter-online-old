var gulp = require('gulp'),
    stylus = require('gulp-stylus'),
    nib = require('nib'),
    livereload = require('gulp-livereload'),
    autoprefixer = require('gulp-autoprefixer'),
    gutil = require('gulp-util'),
    webpack = require('webpack'),
    path = require('path'),
    config = {
      debug: false,
      livereload: false
    };


gulp.task('js', function() {
  var settings = {
    entry: './static/js/app.js',
    output: {
      path: './static/build/',
      filename: 'app.js'
    }
  };
  if (config.debug) {
    settings.devtool = 'inline-source-map';
    settings.debug = true;
  }
  webpack(settings, function(error, stats) {
    if (error)
      throw new gutil.PluginError('[js]', error);
    gutil.log('[js]', stats.toString({colors: true}));
  });
});

gulp.task('css', function() {
  var task = gulp.src('static/css/app.styl')
    .pipe(stylus({sourcemaps: config.debug, use: [nib()]}))
      .on('error', gutil.log)
      .on('error', gutil.beep)
    .pipe(autoprefixer('last 2 versions'))
    .pipe(gulp.dest('static/build/'));

  if (config.livereload)
    task.pipe(livereload());
});


gulp.task('devserver', ['config:debug', 'config:livereload', 'css', 'js'], function() {
  run('python', ['brouter.py']);

  gulp.watch('static/css/*.styl', ['css']);
  gulp.watch('static/js/**.js', ['js']);
});


/**
  config tasks
*/
gulp.task('config:debug', function() {
  config.debug = true;
});
gulp.task('config:livereload', function() {
  config.livereload = true;
});

/**
   utils
*/
function run(cmd, args) {
  require('child_process').spawn(cmd, args, {stdio: 'inherit'});
}
