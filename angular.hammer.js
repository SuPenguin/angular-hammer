// ---- Angular Hammer ----

// Copyright (c) 2015 Ryan S Mullins <ryan@ryanmullins.org>
// Licensed under the MIT Software License
//
// modifications by James Wilson <me@unbui.lt>
//

(function (window, angular, Hammer) {
  'use strict';

  // Checking to make sure Hammer and Angular are defined

  if (typeof angular === 'undefined') {
    if (typeof require !== 'undefined' && require) {
      try {
        angular = require('angular');
      } catch (e) {
        return console.log('ERROR: Angular Hammer could not require() a reference to angular');
      }
    } else if (typeof window.angular !== 'undefined') {
      angular = window.angular;
    } else {
      return console.log('ERROR: Angular Hammer could not find or require() a reference to angular');
    }
  }

  if (typeof Hammer === 'undefined') {
    if (typeof require !== 'undefined' && require) {
      try {
        Hammer = require('hammerjs');
      } catch (e) {
        return console.log('ERROR: Angular Hammer could not require() a reference to Hammer');
      }
    } else if (typeof window.Hammer !== 'undefined') {
      Hammer = window.Hammer;
    } else {
      return console.log('ERROR: Angular Hammer could not find or require() a reference to Hammer');
    }
  }

  /**
   * Mapping of the gesture event names with the Angular attribute directive
   * names. Follows the form: <directiveName>:<eventName>.
   *
   * @type {Array}
   */
  var gestureTypes = [
    'hmCustom:custom',
    'hmSwipe:swipe',
    'hmSwipeleft:swipeleft',
    'hmSwiperight:swiperight',
    'hmSwipeup:swipeup',
    'hmSwipedown:swipedown',
    'hmPan:pan',
    'hmPanstart:panstart',
    'hmPanmove:panmove',
    'hmPanend:panend',
    'hmPancancel:pancancel',
    'hmPanleft:panleft',
    'hmPanright:panright',
    'hmPanup:panup',
    'hmPandown:pandown',
    'hmPress:press',
    'hmPressup:pressup',
    'hmRotate:rotate',
    'hmRotatestart:rotatestart',
    'hmRotatemove:rotatemove',
    'hmRotateend:rotateend',
    'hmRotatecancel:rotatecancel',
    'hmPinch:pinch',
    'hmPinchstart:pinchstart',
    'hmPinchmove:pinchmove',
    'hmPinchend:pinchend',
    'hmPinchcancel:pinchcancel',
    'hmPinchin:pinchin',
    'hmPinchout:pinchout',
    'hmTap:tap',
    'hmDoubletap:doubletap'
  ];

  // ---- Module Definition ----

  /**
   * @module hmTouchEvents
   * @description Angular.js module for adding Hammer.js event listeners to HTML
   * elements using attribute directives
   * @requires angular
   * @requires hammer
   */
  var NAME = 'hmTouchEvents';
  var hmTouchEvents = angular.module('hmTouchEvents', []);

  /**
   * Provides a common interface for configuring global manager and recognizer
   * options. Allows things like tap duration etc to be defaulted globally and
   * overridden on a per-directive basis as needed.
   *
   * @return {Object} functions to add manager and recognizer options.
   */
  hmTouchEvents.provider(NAME, function(){

    var self = this;
    var defaultRecognizerOpts = false;
    var recognizerOptsHash = {};
    var managerOpts = {};

    //
    // In order to use the Hamme rpresets provided, we need
    // to map the recognizer fn to some name:
    //
    var recognizerFnToName = {};
    recognizerFnToName[ Hammer.Tap.toString() ] = "tap";
    recognizerFnToName[ Hammer.Pan.toString() ] = "pan";
    recognizerFnToName[ Hammer.Pinch.toString() ] = "pinch";
    recognizerFnToName[ Hammer.Press.toString() ] = "press";
    recognizerFnToName[ Hammer.Rotate.toString() ] = "rotate";
    recognizerFnToName[ Hammer.Swipe.toString() ] = "swipe";

    //
    // Make use of presets from Hammer.defaults.preset array
    // in angular-hammer events.
    //
    self.applyHammerPresets = function(){
      var hammerPresets = Hammer.defaults.preset;

      //add each preset to defaults list so long as there
      //is associated config with it:
      angular.forEach(hammerPresets, function(presetArr){
        var name = recognizerFnToName[presetArr[0]];
        var data = presetArr[1];
        if(!data || !name) return;
        recognizerOptsHash[name] = angular.copy(data);
      });
    }

    //
    // Add a manager option (key/val to extend or object to set all):
    //
    self.addManagerOption = function(name, val){
      if(typeof name == "object"){
        angular.extend(managerOpts, name);
      }
      else {
        managerOpts[name] = val;
      }
    }

    //
    // Add a recognizer option (key/val or object with "type" set):
    //
    self.addRecognizerOption = function(name, val){
      if(Array.isArray(name)){
        for(var i = 0; i < name.length; i++) self.addRecognizerOption(name[i]);
        return;
      }
      if(typeof name == "object") {
        val = name;
        name = val.type;
      }
      if(typeof val != "object") {
        throw Error(NAME+"Provider: recognizer value expected to be object");
      }
      if(!name){
        defaultRecognizerOpts = val;
      } else {
        recognizerOptsHash[val.type] = val;
      }
    }

    // internal helper funcs:
    function doRecognizerOptsExist(type, arr){
      for(var i = 0; i < arr.length; i++){
        if(arr[i].type == type) return true;
      }
      return false;
    }
    function doDefaultRecognizerOptsExist(arr){
      for(var i = 0; i < arr.length; i++){
        if(!arr[i].type) return true;
      }
      return false;
    }

    //provide an interface to this that the hm-* directives use
    //to extend their recognizer/manager opts.
    self.$get = function(){
      return {
        extendWithDefaultManagerOpts: function(opts){
          if(typeof opts != "object"){
            opts = {};
          }
          var out = {};
          for(var name in managerOpts) {
            if(!opts[name]) opts[name] = angular.copy(managerOpts[name]);
          }
          return angular.extend({}, managerOpts, opts);
        },
        extendWithDefaultRecognizerOpts: function(eventName, opts){

          var eventType = getRecognizerTypeFromeventName(eventName);

          if(typeof opts == "undefined"){
            opts = [];
          } else if(!Array.isArray(opts)){
            opts = [opts];
          }

          //dont apply anything if this is custom event
          //(beyond normalizing opts to an array):
          if(eventType == "custom") return opts;

          var eventOpts = recognizerOptsHash[eventType];

          //find any defaults provided and extend them 
          //together with global defaults:
          var defaults = angular.extend({}, defaultRecognizerOpts || {}, opts.reduce(function(o, opt){
            if(opt.type) return o;
            return angular.extend(o, opt);
          }, {}));

          //no opts, but either defaults or eventOpts, so we
          //create an opt to get those options in and return:
          if(!opts.length) return [angular.extend({type:eventType}, defaults, eventOpts || {})];

          //one or more opts; extend the opt matching this eventName
          //with the defaults and event-specific opts set up here.
          //remove "default" opts entirely as we merge them in with
          //the relevant type here anyway.
          return opts.map(function(opt){

            if(!opt.type) return false;
            if(opt.type == eventType) return angular.extend({}, defaults, eventOpts || {}, opt);
            else return opt;

          }).filter(angular.identity);

        }
      };
    };

  });

  /**
   * Iterates through each gesture type mapping and creates a directive for
   * each of the
   *
   * @param  {String} type Mapping in the form of <directiveName>:<eventName>
   * @return None
   */
  angular.forEach(gestureTypes, function (type) {
    var directive = type.split(':'),
        directiveName = directive[0],
        eventName = directive[1];

    hmTouchEvents.directive(directiveName, ['$parse', '$window', NAME, function ($parse, $window, defaultEvents) {
        return {
          'restrict' : 'A',
          'link' : function (scope, element, attrs) {

            // Check for Hammer and required functionality.
            // error if they arent found as unexpected behaviour otherwise
            if (!Hammer || !$window.addEventListener) {
              throw Error(NAME+": window.Hammer or window.addEventListener not found, can't add event "+directiveName);
            }

            var hammer = element.data('hammer'),
                managerOpts = defaultEvents.extendWithDefaultManagerOpts( scope.$eval(attrs.hmManagerOptions) ),
                recognizerOpts = defaultEvents.extendWithDefaultRecognizerOpts( eventName, scope.$eval(attrs.hmRecognizerOptions) );

            // Check for a manager, make one if needed and destroy it when
            // the scope is destroyed
            if (!hammer) {
              hammer = new Hammer.Manager(element[0], managerOpts);
              element.data('hammer', hammer);
              scope.$on('$destroy', function () {
                hammer.destroy();
              });
            }

            // Instantiate the handler
            var handlerName = attrs[directiveName],
                handlerExpr = $parse(handlerName),
                handler = function (event) {
                  var phase = scope.$root.$$phase,
                      recognizer = hammer.get(event.type);

                  event.element = element;

                  if (recognizer) {
                    if (recognizer.options.preventDefault) {
                      event.preventDefault();
                    }

                    if (recognizer.options.stopPropagation) {
                      event.srcEvent.stopPropagation();
                    }
                  }

                  if (phase === '$apply' || phase === '$digest') {
                    callHandler();
                  } else {
                    scope.$apply(callHandler);
                  }

                  function callHandler () {
                    var fn = handlerExpr(scope, {'$event':event});

                    if (typeof fn === 'function') {
                      fn.call(scope, event);
                    }
                  }
                };


            // The recognizer options are normalized to an array. Angular 
            // Hammer iterates through the array of options
            // trying to find an occurrence of the options.type in the event
            // name. If it find the type in the event name, it applies those
            // options to the recognizer for events with that name. If it
            // does not find the type in the event name it moves on.

            angular.forEach(recognizerOpts, function (options) {

              if (directiveName === 'hmCustom') {
                eventName = options.event;
              } else {

                //ignore these options if not custom and not
                //matching the event type we are working with:
                if(eventName.indexOf(options.type || "") == -1){
                  return;
                }

                if (options.event) {
                  delete options.event;
                }
              }

              //not a custom directive, so apply the defaults
              //depending on the directive we're using.
              //(to make things like double tap work)
              if(directiveName !== 'hmCustom'){

                if (directiveName === 'hmDoubletap') {
                  options.event = eventName;
                  options.taps = 2;

                  if (hammer.get('tap')) {
                    options.recognizeWith = 'tap';
                  }
                }

                if (options.type.indexOf('pan') > -1 &&
                    hammer.get('swipe')) {
                  options.recognizeWith = 'swipe';
                }

                if (options.type.indexOf('pinch') > -1 &&
                    hammer.get('rotate')) {
                  options.recognizeWith = 'rotate';
                }

              }

              //apply the recognizer options:
              setupRecognizerWithOptions(
                hammer,
                applyManagerOptions(managerOpts, options),
                element
              );

            });

            //apply the event so long as there were actually some
            //recognizers applied for it
            if (recognizerOpts.length) {
              hammer.on(eventName, handler);
            }

          }
        };
      }]);
  });

  // ---- Private Functions -----

  /**
   * Adds a gesture recognizer to a given manager. The type of recognizer to
   * add is determined by the value of the options.type property.
   *
   * @param {Object}  manager Hammer.js manager object assigned to an element
   * @param {String}  type    Options that define the recognizer to add
   * @return {Object}         Reference to the new gesture recognizer, if
   *                          successful, null otherwise.
   */
  function addRecognizer (manager, type) {
    if (manager === undefined || type === undefined) { return null; }

    var recognizer;

    if (type.indexOf('pan') > -1) {
      recognizer = new Hammer.Pan();
    } else if (type.indexOf('pinch') > -1) {
      recognizer = new Hammer.Pinch();
    } else if (type.indexOf('press') > -1) {
      recognizer = new Hammer.Press();
    } else if (type.indexOf('rotate') > -1) {
      recognizer = new Hammer.Rotate();
    } else if (type.indexOf('swipe') > -1) {
      recognizer = new Hammer.Swipe();
    } else {
      recognizer = new Hammer.Tap();
    }

    manager.add(recognizer);
    return recognizer;
  }

  /**
   * Applies certain manager options to individual recognizer options.
   *
   * @param  {Object} managerOpts    Manager options
   * @param  {Object} recognizerOpts Recognizer options
   * @return None
   */
  function applyManagerOptions (managerOpts, recognizerOpts) {
    if (managerOpts) {
      recognizerOpts.preventGhosts = managerOpts.preventGhosts;
    }

    return recognizerOpts;
  }

  /**
   * Extracts the type of recognizer that should be instantiated from a given
   * event name. Used only when no recognizer options are provided.
   *
   * @param  {String} eventName Name to derive the recognizer type from
   * @return {string}           Type of recognizer that fires events with that name
   */
  function getRecognizerTypeFromeventName (eventName) {
    if (eventName.indexOf('pan') > -1) {
      return 'pan';
    } else if (eventName.indexOf('pinch') > -1) {
      return 'pinch';
    } else if (eventName.indexOf('press') > -1) {
      return 'press';
    } else if (eventName.indexOf('rotate') > -1) {
      return 'rotate';
    } else if (eventName.indexOf('swipe') > -1) {
      return 'swipe';
    } else {
      return 'tap';
    }
  }

  /**
   * Applies the passed options object to the appropriate gesture recognizer.
   * Recognizers are created if they do not already exist. See the README for a
   * description of the options object that can be passed to this function.
   *
   * @param  {Object} manager Hammer.js manager object assigned to an element
   * @param  {Object} options Options applied to a recognizer managed by manager
   * @return None
   */
  function setupRecognizerWithOptions (manager, options, element) {
    if (manager == null || options == null || options.type == null) {
      return console.error('ERROR: Angular Hammer could not setup the' +
        ' recognizer. Values of the passed manager and options: ', manager, options);
    }

    var recognizer = manager.get(options.type);

    if (!recognizer) {
      recognizer = addRecognizer(manager, options.type);
    }

    if (!options.directions) {
      if (options.type === 'pan' || options.type === 'swipe') {
        options.directions = 'DIRECTION_ALL';
      } else if (options.type.indexOf('left') > -1) {
        options.directions = 'DIRECTION_LEFT';
      } else if (options.type.indexOf('right') > -1) {
        options.directions = 'DIRECTION_RIGHT';
      } else if (options.type.indexOf('up') > -1) {
        options.directions = 'DIRECTION_UP';
      } else if (options.type.indexOf('down') > -1) {
        options.directions = 'DIRECTION_DOWN';
      } else {
        options.directions = '';
      }
    }

    options.direction = parseDirections(options.directions);
    recognizer.set(options);

    if (typeof options.recognizeWith === 'string') {
      var recognizeWithRecognizer;

      if (manager.get(options.recognizeWith) == null){
        recognizeWithRecognizer = addRecognizer(manager, options.recognizeWith);
      }

      if (recognizeWithRecognizer != null) {
        recognizer.recognizeWith(recognizeWithRecognizer);
      }
    }

    if (typeof options.dropRecognizeWith  === 'string' &&
        manager.get(options.dropRecognizeWith) != null) {
      recognizer.dropRecognizeWith(manager.get(options.dropRecognizeWith));
    }

    if (typeof options.requireFailure  === 'string') {
      var requireFailureRecognizer;

      if (manager.get(options.requireFailure) == null){
        requireFailureRecognizer = addRecognizer(manager, {type:options.requireFailure});
      }

      if (requireFailureRecognizer != null) {
        recognizer.requireFailure(requireFailureRecognizer);
      }
    }

    if (typeof options.dropRequireFailure === 'string' &&
        manager.get(options.dropRequireFailure) != null) {
      recognizer.dropRequireFailure(manager.get(options.dropRequireFailure));
    }

    if (options.preventGhosts === true && element != null) {
      preventGhosts(element);
    }
  }

  /**
   * Parses the value of the directions property of any Angular Hammer options
   * object and converts them into the standard Hammer.js directions values.
   *
   * @param  {String} dirs Direction names separated by '|' characters
   * @return {Number}      Hammer.js direction value
   */
  function parseDirections (dirs) {
    var directions = 0;

    angular.forEach(dirs.split('|'), function (direction) {
      if (Hammer.hasOwnProperty(direction)) {
        directions = directions | Hammer[direction];
      }
    });

    return directions;
  }

  // ---- Preventing Ghost Clicks ----

  /**
   * Modified from: https://gist.github.com/jtangelder/361052976f044200ea17
   *
   * Prevent click events after a touchend.
   *
   * Inspired/copy-paste from this article of Google by Ryan Fioravanti
   * https://developers.google.com/mobile/articles/fast_buttons#ghost
   */

  function preventGhosts (element) {
    if (!element) { return; }

    var coordinates = [],
        threshold = 25,
        timeout = 2500;

    if ('ontouchstart' in window) {
      element[0].addEventListener('touchstart', resetCoordinates, true);
      element[0].addEventListener('touchend', registerCoordinates, true);
      element[0].addEventListener('click', preventGhostClick, true);
      element[0].addEventListener('mouseup', preventGhostClick, true);
    }

    /**
     * prevent clicks if they're in a registered XY region
     * @param {MouseEvent} ev
     */
    function preventGhostClick (ev) {
      for (var i = 0; i < coordinates.length; i++) {
        var x = coordinates[i][0];
        var y = coordinates[i][1];

        // within the range, so prevent the click
        if (Math.abs(ev.clientX - x) < threshold &&
            Math.abs(ev.clientY - y) < threshold) {
          ev.stopPropagation();
          ev.preventDefault();
          break;
        }
      }
    }

    /**
     * reset the coordinates array
     */
    function resetCoordinates () {
      coordinates = [];
    }

    /**
     * remove the first coordinates set from the array
     */
    function popCoordinates () {
      coordinates.splice(0, 1);
    }

    /**
     * if it is an final touchend, we want to register it's place
     * @param {TouchEvent} ev
     */
    function registerCoordinates (ev) {
      // touchend is triggered on every releasing finger
      // changed touches always contain the removed touches on a touchend
      // the touches object might contain these also at some browsers (firefox os)
      // so touches - changedTouches will be 0 or lower, like -1, on the final touchend
      if(ev.touches.length - ev.changedTouches.length <= 0) {
        var touch = ev.changedTouches[0];
        coordinates.push([touch.clientX, touch.clientY]);

        setTimeout(popCoordinates, timeout);
      }
    }
  }
})(window, window.angular, window.Hammer);
