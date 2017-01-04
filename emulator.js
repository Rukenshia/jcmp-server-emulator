'use strict';

const { ClassHelper, _log } = require('jcmp-stubs');
/**
 * The Emulator Class provides various helper functions to imitate the JC3:MP Server.
 */
class Emulator {
  /**
   * Creates a new Emulator instance
   * 
   * @param {ClassBuilder} classBuilder
   */
  constructor(classBuilder) {
    this.builder = classBuilder;
  }

  /**
   * Changes the log level
   * 
   * @param {number} level - 0: debug, 1: property, 2: function, 3: event, 4: info, 5: warning, 6: error
   */
  setLogLevel(level) {
    this.log.config({ level });
    log.config({ level });
  }

  /**
   * Creates a new fake Player. This function calls all the jcmp.events as if a 'normal' player connected.
   * 
   * @param {string} [name='JC3:MP Player']
   */
  createFakePlayer(name = 'JC3:MP Player') {
    const client = ClassHelper.build(this.builder, 'RemoteClient', ({ set }) => {
      set('ipAddress', '127.0.0.1');
      set('name', name);
      set('steamId', `76${Math.floor((Math.random() * 99999999999999) + 1000000000000000)}`);
      set('steamAuthenticated', true);
    });
    const player = ClassHelper.build(this.builder, 'Player', ({ c: p, set }) => {
      set('name', name);
      set('client', client);
    });

    const retns = jcmp.events.fakeCall('ClientConnectRequest', name, '127.0.0.1');
    if (retns.some(b => b === false)) {
      log.debug(`ClientConnectRequest has been denied`);
      return;
    }

    jcmp.events.fakeCall('ClientConnected', client);
    jcmp.events.fakeCall('PlayerCreated', player);
    
    setTimeout(() => {
      if (player.__metadata.destroyed) {
        log.debug(`not firing PlayerReady, player is already destroyed`);
        return;
      }
      log.debug(`firing PlayerReady`);
      jcmp.events.fakeCall('PlayerReady', player);
    }, Math.floor(Math.random() * 1000) + 100);
  }

  /**
   * Disconnects a fake player.
   * 
   * @param {Player} player
   */
  disconnectFakePlayer(player) {
    jcmp.events.fakeCall('PlayerDestroyed', player);
    jcmp.events.fakeCall('ClientDisconnected', player.client);
    player.__metadata.destroyed = true;
    jcmp.players.splice(jcmp.players.indexOf(player), 1);
  }

  /**
   * Gets the Object Tree as a normal JS object without getters and setters
   * 
   * @private
   * @param {object} obj
   * @returns {object}
   */
  _getObj(obj) {
    const o = {};
    const keys = Object.getOwnPropertyNames(Object.getPrototypeOf(obj) || {});
    for (const key of keys) {
      if (key === '__metadata') {
        continue;
      }

      if (typeof obj[key] === 'object' && obj[key] !== null) {
        o[key] = this._getObj(obj[key]);
      } else {
        o[key] = obj[key];
      }
    }
    return o;
  }

  /**
   * Prints the Object
   * 
   * @param {Class} obj
   */
  print(obj) {
    const o = this._getObj(obj);
    console.log(o);
  }
}

module.exports = { Emulator };