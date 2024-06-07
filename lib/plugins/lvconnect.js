'use strict';

var engine = require('lvconnect');

function init( env, bus ) {
  if(   env.extendedSettings.lvconnect &&
      ( env.extendedSettings.lvconnect.userName           || env.extendedSettings.lvconnect.proUserName           ) &&
      ( env.extendedSettings.lvconnect.password           || env.extendedSettings.lvconnect.proPassword           ) &&
      ( env.extendedSettings.lvconnect.trustedDeviceToken || env.extendedSettings.lvconnect.proTrustedDeviceToken )
  ) {
    return create( env, bus );

  } else {
    console.info( 'LibreView connect is not enabled, or misconfigured.' );
  }
}

function create( env, bus ) {
  let opts = {
    login         : {
      accountName        : env.extendedSettings.lvconnect.userName ||
                           env.extendedSettings.lvconnect.proUserName,
      password           : env.extendedSettings.lvconnect.password ||
                           env.extendedSettings.lvconnect.proPassword,
      trustedDeviceToken : env.extendedSettings.lvconnect.trustedDeviceToken ||
                           env.extendedSettings.lvconnect.proTrustedDeviceToken,
      patientId          : env.extendedSettings.lvconnect.patientId,
      proCredentialsUrl  : env.extendedSettings.lvconnect.proCredentialsUrl,
      proCredentialsKey  : env.extendedSettings.lvconnect.proCredentialsKey
    },                   // No shorter than 5 minutes, or longer than 8 hours
    interval             : env.extendedSettings.lvconnect.interval >   299999 ||
                           env.extendedSettings.lvconnect.interval < 28800001 ?
                           env.extendedSettings.lvconnect.interval :  3600000,
    nightscout           : {},
    fetchTimeout         : env.extendedSettings.lvconnect.fetchTimeout      || 2000,
    maxFailures          : env.extendedSettings.lvconnect.maxFailures       || 3,
    firstFullDays        : env.extendedSettings.lvconnect.firstFullDays     || 1
    // timeOffsetMinutes    : env.extendedSettings.lvconnect.timeOffsetMinutes
  };

  return {
    startEngine : ( entries ) => {

      opts.callback  = callback( entries );
      opts.lastts    = lastts( entries );

      let timer = null;
      (function run() {
        console.info( "Fetching LibreView Data..." );
        engine(opts);
        timer = setTimeout(run, opts.interval);
      })();

      if (bus) bus.on('teardown', () => { if( timer ) clearInterval(timer); });
    }
  };
}

function callback( entries ) {
  return ( err, glucose ) => {
    if( err )
      console.error( 'lvconnect error: ', err );
    else
      entries.create( glucose, ( err ) => {
        if( err ) console.error('lvconnect storage error: ', err);
      });
  };
}

function lastts( entries ) {
  return ( records ) => {
    entries.list({
      find: {
        device: {
          $regex: 'lvconnect'
        }
      },
      count: 1,
    }, records );
  }
}

init.create   = create;
init.callback = callback;
exports = module.exports = init;
