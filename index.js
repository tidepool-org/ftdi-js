/*
* == BSD2 LICENSE ==
* Copyright (c) 2020, Tidepool Project
*
* This program is free software; you can redistribute it and/or modify it under
* the terms of the associated License, which is identical to the BSD 2-Clause
* License as published by the Open Source Initiative at opensource.org.
*
* This program is distributed in the hope that it will be useful, but WITHOUT
* ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS
* FOR A PARTICULAR PURPOSE. See the License for more details.
*
* You should have received a copy of the License along with this program; if
* not, you can obtain one from Tidepool Project at tidepool.org.
* == BSD2 LICENSE ==
*/

const usb = require('webusb').usb;
const EventEmitter = require('events');

const H_CLK = 120000000;
const C_CLK = 48000000;

function FTDIToClkbits(baud, clk, clkDiv) {
    const fracCode = [0, 3, 2, 4, 1, 5, 6, 7];
    let bestBaud = 0;
    let divisor;
    let bestDivisor;
    let encodedDivisor;

    if (baud >= clk / clkDiv) {
        encodedDivisor = 0;
        bestBaud = clk / dlkDiv;
    } else if (baud >= clk / (clkDiv + clkDiv / 2)) {
        encodedDivisor = 1;
        bestBaud = clk / (clkDiv + clkDiv / 2);
    } else if (baud >= clk / (2 * clkDiv)) {
        encodedDivisor = 2;
        bestBaud = clk / (2 * clkDiv);
    } else {
        divisor = clk * 16 / clkDiv / baud;
        if (divisor & 1) {
            bestDivisor = divisor / 2 + 1;
        } else {
            bestDivisor = divisor / 2;
        }

        if (bestDivisor > 0x20000) {
            bestDivisor = 0x1ffff;
        }

        bestBaud = clk * 16 / clkDiv / bestDivisor;

        if (bestBaud & 1) {
            bestBaud = bestBaud / 2 + 1;
        } else {
            bestBaud = bestBaud / 2;
        }

        encodedDivisor = (bestDivisor >> 3) | (fracCode[bestDivisor & 0x7] << 14);
    }

    return [bestBaud, encodedDivisor];
}

function FTDIConvertBaudrate(baud) {
    let bestBaud;
    let encodedDivisor;
    let value;
    let index;

    if (baud <= 0) {
        throw new Error('Baud rate must be > 0');
    }

    [bestBaud, encodedDivisor] = FTDIToClkbits(baud, C_CLK, 16);

    value = encodedDivisor & 0xffff;
    index = encodedDivisor >> 16;

    return [bestBaud, value, index];
}

class ftdi extends EventEmitter {
  constructor(vendorId, productId, options) {
    super();
    const self = this;

    (async () => {
      const device = await usb.requestDevice({
        filters: [
          {
            vendorId,
            productId,
          }
        ]
      });

      if (device.opened) {
          console.log('Already open');
          await device.close();
      }
      await device.open();
      console.log('Opened:', device.opened);

      if (device.configuration === null) {
        console.log('selectConfiguration');
        await device.selectConfiguration(1);
      }
      await device.claimInterface(0);
      await device.selectConfiguration(1);
      await device.selectAlternateInterface(0, 0);

      const [baud] = FTDIConvertBaudrate(options.baudRate);
      console.log('Setting baud rate to', baud);
      const result = await device.controlTransferOut({
          requestType: 'vendor',
          recipient: 'device',
          request: 3,
          value ,
          index,
      });

      self.device = device;
      self.isClosing = false;
      this.device.transferIn(1, 64); // flush buffer
      self.readLoop();
      self.emit('ready');
    })().catch((error) => {
      console.log('Error during FTDI setup:', error);
      self.emit('error', error);
    });
  }

  async readLoop() {
    let result;

    try {
      result = await this.device.transferIn(1, 64);
    } catch (error) {
      console.log('Error reading data:', error);
    };

    if (result && result.data && result.data.byteLength && result.data.byteLength > 2) {
      console.log(`Received ${result.data.byteLength - 2} byte(s).`);
      const uint8buffer = new Uint8Array(result.data.buffer);
      this.emit('data', uint8buffer.slice(2));
    }

    if (!this.isClosing && this.device.opened) {
      this.readLoop();
    }
  };

  async read() {
    const {data: {buffer: dataBuffer, byteLength: bytesRead}} = await this.device.transferIn(1, 64);
    const uint8buffer = new Uint8Array(dataBuffer);

    if (bytesRead === 2) {
      return this.read();
    }

    return { bytesRead: bytesRead-2, data: uint8buffer.slice(2) };
  }

  async writeAsync(buffer) {
    return await this.device.transferOut(2, buffer);
  }

  write(data, cb) {
    this.writeAsync(data).then(() => {
      cb();
    }, err => cb(err));
  }

  async closeAsync() {
    await this.device.releaseInterface(0);
    await this.device.close();
  }

  close(cb) {
    this.isClosing = true;
    (async () => {
      await this.device.releaseInterface(0);
      await this.device.close();
      return cb();
    })().catch((error) => {
      return cb(error);
    });
  }
}

module.exports = ftdi;
