const gulp = require('gulp');

// html

const pug = require('gulp-pug');
const plumber = require('gulp-plumber');
const pugLinter = require('gulp-pug-linter');
const htmlValidator = require('gulp-w3c-html-validator');

// inject styles ans scripts

const inject = require('gulp-inject');
const streamSeries = require('stream-series');

// css

const sass = require('gulp-sass');
const sassGlob = require('gulp-sass-glob');
const autoprefixer = require('gulp-autoprefixer');
const cleanCss = require('gulp-clean-css');
const sourcemaps = require('gulp-sourcemaps');

// js

const babel = require('gulp-babel');
const uglify = require('gulp-uglify');

//images

const imagemin = require('gulp-imagemin');
const webP = require('gulp-webp');
const svgstore = require('gulp-svgstore');

//utils

const bSync = require('browser-sync').create();
const rename = require('gulp-rename');
const replace = require('gulp-replace');
const gulpif = require('gulp-if');
const clean = require('gulp-clean');
const env = process.env.NODE_ENV;

const VENDOR_CSS = [
  // './node_modules/bootstrap/dist/css/bootstrap-grid.min.css',
  './node_modules/normalize.css/normalize.css'
];

const VENDOR_JS = [
  // './node_modules/jquery/dist/jquery.min.js',
]

const SRC = 'src';
const DEST = 'build';

const vendorCss = () => {
  return gulp
    .src(VENDOR_CSS)
    .pipe(gulp.dest(`${DEST}/css/vendor`))
}

const mainCss = () => {
  return gulp
    .src(`${SRC}/sass/style.scss`)
    .pipe(plumber())
    .pipe(gulpif(env === 'dev', sourcemaps.init()))
    .pipe(sassGlob())
    .pipe(sass().on('error', sass.logError))
    .pipe(replace('../../img', '../img'))
    .pipe(autoprefixer({
      grid: 'autoplace'
    }))
    .pipe(gulpif(env === 'prod', cleanCss()))
    .pipe(gulpif(env === 'dev', sourcemaps.write()))
    .pipe(gulp.dest(`${DEST}/css`))
    .pipe(bSync.stream());
}

const vendorJs = () => {
  return gulp
    .src([...VENDOR_JS, `${SRC}/js/vendor`])
    .pipe(gulp.dest(`${DEST}/js/vendor`))
}

const mainJs = () => {
  return gulp.src(`${SRC}/js/*.js`)
    .pipe(gulpif(env === 'dev', sourcemaps.init()))
    .pipe(gulpif(env === 'prod', babel({
      presets: ['@babel/env']
    })))
    .pipe(gulpif(env === 'prod', uglify()))
    .pipe(gulpif(env === 'prod', rename('script.min.js')))
    .pipe(gulpif(env === 'dev', sourcemaps.write()))
    .pipe(gulp.dest(`${DEST}/js`))
};

const html = () => {
  return gulp
    .src(`${SRC}/pug/*.pug`)
    .pipe(plumber())
    .pipe(pugLinter({
      reporter: 'default'
    }))
    .pipe(pug({
      pretty: true
    }))
    .pipe(replace('../../img', 'img'))
    .pipe(htmlValidator())
    .pipe(gulp.dest(DEST));
}

const injectCssJs = () => {
  return gulp
    .src(`${DEST}/*.html`)
    .pipe(inject(gulp
      .src([`${DEST}/js/vendor/jquery.min.js`], {
        read: false,
        allowEmpty: true
      }), {
        relative: true,
        name: 'head'
      }))
    .pipe(
      inject(
        streamSeries(
          gulp.src([`${DEST}/js/vendor/*.js`, `!${DEST}/js/vendor/jquery.min.js`, `${DEST}/css/vendor/*.css`], {
            read: false,
            allowEmpty: true
          }),
          gulp.src([`${DEST}/js/*.js`, `${DEST}/css/*.css`], {
            read: false
          })

        ), {
          relative: true
        }
      )
    )
    .pipe(gulp.dest(DEST))
}

const img = () => {
  return gulp.src(`${SRC}/img/**/*.{png,jpg,svg}`)
    .pipe(imagemin([
      imagemin.optipng({
        optimizationLevel: 3
      }),
      imagemin.mozjpeg({
        quality: 80,
        progressive: true
      }),
      imagemin.svgo()
    ]))
    .pipe(gulp.dest(`${DEST}/img`));
};

const webp = () => {
  return gulp.src(`${SRC}/img/**/*.{png,jpg}`)
    .pipe(webP({
      quality: 90
    }))
    .pipe(gulp.dest(`${DEST}/img`));
};

const sprite = () => {
  return gulp.src(`${SRC}/img/icon-*.svg`)
    .pipe(svgstore({
      inlineSvg: true
    }))
    .pipe(rename('sprite.svg'))
    .pipe(gulp.dest(`${DEST}/img`));
};

const fonts = () => {
  return gulp.src(`${SRC}/fonts/**/*.{woff,woff2}`)
    .pipe(gulp.dest(`${DEST}/fonts`))
}

const reload = (done) => {
  bSync.reload();
  done();
};

const serve = () => {
  bSync.init({
    server: `${DEST}/`,
    notify: false,
    open: false,
    cors: true,
    ui: false
  });

  gulp.watch(`${SRC}/pug/**/*.pug`, gulp.series(html, injectCssJs, reload));
  gulp.watch(`${SRC}/sass/**/*.scss`, mainCss);
  gulp.watch(`${SRC}/js/**/*.js`, gulp.series(mainJs, reload));
  gulp.watch(`${SRC}/img/icon-*.svg`, gulp.series(sprite, reload));
};

const cleanDest = () => {
  return gulp.src(`${DEST}/*`, {
      read: false
    })
    .pipe(clean({
      force: true
    }))
};

exports.clean = cleanDest;

const pics = gulp.series(img, webp, sprite);
const main = gulp.parallel(pics, fonts, vendorCss, mainCss, vendorJs, mainJs, html);

exports.pics = gulp.series(pics, reload);

exports.default = gulp.series(cleanDest, main, injectCssJs, serve);

exports.build = gulp.series(cleanDest, main, injectCssJs);