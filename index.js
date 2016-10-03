'use strict';
const fs = require('fs');
const path = require('path');

global.log = require('custom-logger').new({
  debug: { color: 'grey', level: 0, event: 'debug' },
  info: { color: 'green', level: 1, event: 'info' },
  warn: { color: 'yellow', level: 2, event: 'warning' },
  error: { color: 'red', level: 3, event: 'ERROR' },
}).config({ level: 0 });

const stubs = require('../jcmp-stubs/index.js');
stubs._setup(function(k, v) {
    global[k] = v;
});
log.info('jcmp-stubs loaded');

log.info('pretending to load client_packages directory');
log.info('just imagine we would start some Networking now');
log.info('loading packages');

if (!fs.existsSync('packages')) {
  throw new Error('no packages directory found');
}

const files = fs.readdirSync('./packages');


const waiting = new Map();
const packages = new Map();

function loadPackage(name) {
  log.debug(`loading package ${name}`);

  require(path.join(__dirname, '/packages/', name, 'main.js'));

  log.debug(`package '${name}' loaded.`);
  events.fakeCall('PackageLoaded', stubs._helper.build('Package', ({ c: pkg, set }) => {
    set('name', name);
    set('valid', true);
    set('dir', path.join('./packages', name));
    packages.set(name, pkg);

    if (packages.size === files.length) {
      setTimeout(() => {
        log.info(`${packages.size} packages loaded.`)
        log.info(`jcmp-server-emulator did its job. hf.`);
      }, 500);
    }
  }));
  waiting.delete(name);

  waiting.forEach((info, name) => {
    checkDependencies(name, info);
  });

}

function checkDependencies(name, info) {
  let allLoaded = true;
  info.jcmp_dependencies.forEach(dep => {
    if (!packages.has(dep)) {
      allLoaded = false;
      log.debug(`package '${name}' is waiting for '${dep}'`);
    }
  });

  if (allLoaded) {
    waiting.delete(name);
    loadPackage(name);
  }
}

files.forEach(file => {
  console.log(file);
  const stat = fs.statSync(path.join('packages', file));
  if (!stat.isDirectory()) {
    log.warn(`non-directory ${file} found. skipping.`)
    return;
  }

  console.log(file);
  const info = require(path.join(__dirname, '/packages/', file, 'package.json'));

  if (typeof info.jcmp_dependencies !== 'undefined') {
    waiting.set(file, info);
    checkDependencies(file, info);
    return;
  }

  loadPackage(file);
})

setInterval(() => {}, 500);