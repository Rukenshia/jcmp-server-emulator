'use strict';
const fs = require('fs');
const path = require('path');

global.log = require('custom-logger').new({
  debug: { color: 'grey', level: 0, event: 'debug' },
  info: { color: 'green', level: 4, event: 'info' },
  warn: { color: 'yellow', level: 5, event: 'warning' },
  error: { color: 'red', level: 6, event: 'ERROR' },
}).config({ level: 0 });

const typeHints = {
  // Special Conversions
  'RGB': [
    'SRGB'
  ],
  'Player': [
    'IPlayer',
  ],
  'LocalPlayer': [
    /class LocalPlayerScripting( * __ptr64)?/,
  ],
  'World': [
    /class WorldScripting( * __ptr64)?/,
  ],
  'Camera': [
    /class CameraScripting( * __ptr64)?/,
  ],
  'Texture': [
    'class ScriptingTexture',
  ],
  'Vector2': [
    /class math::basic_vector2<int>/,
    /SVector2/,
  ],
  'Vector2f': [
    /class math::basic_vector2<float>/,
    /SVector2f/,
  ],
  'Vector3': [
    /class math::basic_vector3<int>/,
    /SVector3.*/,
  ],
  'Vector3f': [
    /class math::basic_vector3<float>/,
    /SVector3f/,
  ],
  'Vector4': [
    /SVector4/,
  ],
  'Vector4f': [
    'struct glm::tvec4<float,0>',
    /SVector4f/,
  ],
  'Matrix': [
    /(class|struct) (math|glm)::t?mat(rix|4x4)?<.*>/,
    'class SMatrix',
  ],
  'JCMPNamespace': [
    /public: (.*?)::JCMPScriptNamespace \* __ptr64/,
  ],
  'JCMPUINamespace': [
    /public: (.*?)::JCMPUINamespace \* __ptr64/,
  ],
  'Array': [
    /class std::vector<(.*?)>/,
  ],
  'any': [
    'class scr::ScriptArg',
    'class scr::ScriptValue',
  ],
  'unknown': [
    '?',
  ],
  'Entity': [
    'ISyncableEntity',
    /class ISyncableEntity( * __ptr64)?/,
  ],
  'PlayerNameTag': [
    /class Nametag( * __ptr64)?/,
  ],
  'Settings': [
    /class SettingsScripting( * __ptr64)?/,
  ],
  'Renderer': [
    'scriptingRenderer',
  ],
};

// load the jcmp-stubs module
const { ClassHelper, ClassBuilder, EventSystem, _setup } = require('jcmp-stubs');
const cb = ClassBuilder.fromDataObject(require('./data/data_server.json'), typeHints);
const events = require('./data/events_server.json');
events.push(...require('./data/events_modules.json'));
const eventSystem = new EventSystem(cb, events);

// setup
_setup(cb, eventSystem, (k, v) => {
  global[k] = v;
});
log.info('jcmp-stubs loaded');

const { Emulator } = require('./emulator');
/** 
 * @global
 * @type {Emulator} 
 */
global.emulator = new Emulator(cb);

// just... whatever.
log.info('pretending to load client_packages directory');
log.info('just imagine we would start some Networking now');
log.info('loading packages');

if (!fs.existsSync('packages')) {
  throw new Error('no packages directory found');
}

const files = fs.readdirSync('./packages');


const waiting = new Map();
const packages = new Map();

/**
 * Loads a Package
 * 
 * @param {string} name - package name
 */
function loadPackage(name) {
  log.debug(`loading package ${name}`);

  require(path.join(process.cwd(), '/packages/', name, 'main.js'));

  log.debug(`package '${name}' loaded.`);
  jcmp.events.fakeCall('PackageLoaded', ClassHelper.build(cb, 'Package', ({ c: pkg, set }) => {
    set('name', name);
    set('valid', true);
    set('dir', path.join('./packages', name));
    packages.set(name, pkg);

    if (packages.size === files.length) {
      log.info(`${packages.size} packages loaded.`);
    }
  }));
  waiting.delete(name);

  waiting.forEach((info, name) => {
    checkDependencies(name, info);
  });

}

/**
 * Checks whether the dependencies of the package have been loaded. If all depdendencies
 * are loaded, loadPackage will be called.
 * 
 * @param {string} name - package name
 * @param {object} info - package info
 * @param {Array<string>} info.jcmp_dependencies - jcmp dependencies
 */
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
  const stat = fs.statSync(path.join('packages', file));
  if (!stat.isDirectory()) {
    log.warn(`non-directory ${file} found. skipping.`)
    return;
  }

  const info = require(path.join(process.cwd(), '/packages/', file, 'package.json'));

  if (typeof info.jcmp_dependencies !== 'undefined') {
    waiting.set(file, info);
    checkDependencies(file, info);
    return;
  }

  loadPackage(file);
})

setInterval(() => {}, 500);