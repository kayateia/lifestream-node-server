// Karma configuration
// Generated on Sat Jul 09 2016 20:55:03 GMT-0400 (EDT)

module.exports = function(config) {
  config.set({

    // base path that will be used to resolve all patterns (eg. files, exclude)
    basePath: '',


    // frameworks to use
    // available frameworks: https://npmjs.org/browse/keyword/karma-adapter
    frameworks: ['jasmine'],


    // list of files / patterns to load in the browser
    files: [
      'public/components/jquery/dist/jquery.js',
      'public/components/angular/angular.js',
      'public/components/angular-animate/angular-animate.js',
      'public/components/angular-cookies/angular-cookies.js',
      'public/components/angular-route/angular-route.js',
      'public/components/angular-inview/angular-inview.js',
      'public/components/bootstrap/dist/js/bootstrap.js',
      'public/components/angular-bootstrap/ui-bootstrap-tpls.js',
      'public/components/angular-bootstrap-lightbox/dist/angular-bootstrap-lightbox.js',
      'public/components/ng-file-upload/ng-file-upload-shim.js',
      'public/components/ng-file-upload/ng-file-upload.js',
      'public/components/angular-mocks/angular-mocks.js',
      'public/scripts/lifestream-svc-alerts.js',
      'public/scripts/lifestream-svc-api.js',
      'public/scripts/lifestream-svc-gallery.js',
      'public/scripts/lifestream-svc-keepalive.js',
      'public/scripts/lifestream-svc-lightbox.js',
      'public/scripts/lifestream-svc-session.js',
      'public/scripts/lifestream-app.js',
      'public/scripts/lifestream-app-account.js',
      'public/scripts/lifestream-app-gallerypage.js',
      'public/scripts/lifestream-app-login.js',
      'public/scripts/lifestream-app-navbar.js',
      'public/scripts/lifestream-app-streams.js',
      'public/scripts/lifestream-app-upload.js',
      'public/scripts/lifestream-app-usermgr.js',
      'tests/*.js'
    ],


    // list of files to exclude
    exclude: [
    ],


    // preprocess matching files before serving them to the browser
    // available preprocessors: https://npmjs.org/browse/keyword/karma-preprocessor
    preprocessors: {
    },


    // test results reporter to use
    // possible values: 'dots', 'progress'
    // available reporters: https://npmjs.org/browse/keyword/karma-reporter
    reporters: ['progress'],


    // web server port
    port: 9876,


    // enable / disable colors in the output (reporters and logs)
    colors: true,


    // level of logging
    // possible values: config.LOG_DISABLE || config.LOG_ERROR || config.LOG_WARN || config.LOG_INFO || config.LOG_DEBUG
    logLevel: config.LOG_INFO,


    // enable / disable watching file and executing tests whenever any file changes
    autoWatch: false,


    // start these browsers
    // available browser launchers: https://npmjs.org/browse/keyword/karma-launcher
    browsers: ['Chrome'],


    // Continuous Integration mode
    // if true, Karma captures browsers, runs the tests and exits
    singleRun: false,

    // Concurrency level
    // how many browser should be started simultaneous
    concurrency: Infinity
  })
}
