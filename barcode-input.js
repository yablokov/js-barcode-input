/**
 * Anonymous function for reading EAN13/USC12 code from barcode scanner.
 * Part of s03-inv project.
 *
 * @param {Object}  opts - an object with configuration parameters
 */

(function() {
    var root = this;
    var previousBarcodo = root.Barcodo;
    var Barcodo;

    if (typeof exports !== 'undefined') {
        Barcodo = exports;
    } else {
        Barcodo = root.Barcodo = {};
    }

    Barcodo.VERSION = '0.0.1';

    var _ = root._;
    if (!_ && (typeof require !== 'undefined')) _ = require('underscore')._;

    /* Return previous value of global Barcodo object,
     * if requested.
     * 
     * @return {Object}
     */
    Barcodo.noConflict = function() {
        root.Barcodo = previousBarcodo;
        return this;
    };

    // Is set to true when we start watching for input.
    var watching = false;

    Barcodo.Scanner = function(opts) {
        this._configure(opts);
    };

    var scannerOpts = [
        'checkBarcodeSymbol',
        'checkFirstBarcodeSymbol',
        'barcodeBreakSymbolCode',
        'barcodeComplete',
        'barcodeStarted',
        'maxScanDuration',
        'barcodeStartedThreshold',
        'barcodeMaxLength',
        'barcodeMinLength',
    ];

    // Set up inheritable Barcodo properties and methods.
    _.extend(Barcodo.Scanner.prototype, {
        maxScanDuration: 200,
        barcodeMaxLength: 13,
        barcodeMinLength: 12,
        barcodeBreakSymbolCode: 13,
        barcodeStartedThreshold: 5,

        _configure: function(opts) {
            var scanner = this;
            _.each(scannerOpts, function(option) {
                if (opts[option]) {
                    scanner[option] = opts[option];
                }
            });
            this.options = opts;

            this.barcode = '';

            // Used while reading the sequence of key input events from scanner.
            this.timer = null;
            // Will be set to true when we reading barcode sequence.
            this.isBarcodeReading = false;

            _.bindAll(this,
                'checkKeycode',
                'startBarcodeReading',
                'stopBarcodeReading');
        },
       /**
        * 
        * @return {boolean}
        */
        validBarcodeLength: function() {
            if (this.barcode.length >= this.barcodeMinLength &&
                this.barcode.length <= this.barcodeMaxLength) {
                return true;
            } else { return false; }
        },

       /**
        * Keyup event handler.
        * Detects barcode sequence from scanner.
        *
        * @param {Object}  Keyup event.
        */
        checkKeycode: function(e) {
            var keyCode = (window.event) ? event.keyCode : e.keyCode;

            var currentChar = String.fromCharCode(keyCode);

            var validBarcodeSymbol = this.checkBarcodeSymbol(keyCode);
            var breakBarcodeSymbol = keyCode == this.barcodeBreakSymbolCode;
            var firstBarcodeSymbol = this.checkFirstBarcodeSymbol(keyCode);

            if (!validBarcodeSymbol && !breakBarcodeSymbol)
                this.stopBarcodeReading();

            if (!this.isBarcodeReading && firstBarcodeSymbol) {
                console.debug("GO");
                // Seems like  the first symbol matches. Time will tell
                // if it's a scanner started triggering events, or it's
                // just some human.
                this.startBarcodeReading();
                this.barcode = currentChar;

            } else if (this.isBarcodeReading && validBarcodeSymbol) {
                // Looks like we continue getting keys from the scanner.
                // (Timeout is still running, otherwise isBarcodeReading
                // would be false)
                this.barcode += currentChar;
                console.debug("GO ON!!");
                if (this.barcode.length == this.barcodeStartedThreshold) {
                    // If we got enough chars to be confident that it's
                    // the scanner sending the barcode, trigger the first
                    // callback.
                    console.debug("ALMOST THERE!!!");
                    this.barcodeStarted(this.barcode);
                }

            } else if (breakBarcodeSymbol && this.validBarcodeLength()) {
                console.debug("Done");
                // Seems like our scanner has just finished reading a barcode.
                // Trigger the callback and shut everything down.
                this.barcodeComplete(this.barcode);
                this.stopBarcodeReading();

            } else {
                this.stopBarcodeReading();
            }
        },

        /**
        *  Obvious function name
        */
        startWatching: function() {
            if (watching)
                throw new Error('Barcodo is already watching input');

            console.debug("Started watching");

            // Handle all keypress events.
            // TODO: Optimize event binding.
            document.onkeyup = this.checkKeycode;
        },

        /**
        * Sets all flags and timer for barcode reading. Returns true
        * if started reading, false if reading is already in progress.
        * 
        * @return {boolean}
        */
        startBarcodeReading: function() {
            if (this.isBarcodeReading == false) {
                console.debug("Started");

                this.isBarcodeReading = true;
                // We will clear the flag after the timeout.
                this.timer = setTimeout(
                    this.stopBarcodeReading,
                    this.maxScanDuration
                );
                return true;
            } else { return false; }
        },

        /**
        * Clears flags, barcode, and the timer used for barcode reading.
        * 
        * @return {boolean}
        */
        stopBarcodeReading: function() {
            if (this.isBarcodeReading == true) {
                console.debug("Stopped");

                this.isBarcodeReading = false;
                clearTimeout(this.timer);
                this.barcode = '';
                return true;
            } else { return false; }
        }
    });
})();
