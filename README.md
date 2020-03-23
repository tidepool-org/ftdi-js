# FTDI.js

This is a user-space USB driver for FTDI chipsets, written in pure JavaScript. It's currently written for Node.js/Electron, but uses the [Node.js implementation of the WebUSB spec](https://github.com/thegecko/webusb), so should easily be adapted for WebUSB in the browser.

## Installation

```
npm install ftdi-js
```

## Usage

### Node.js / Electron

```js
const FTDI = require('ftdi-js');

const ftdi = new FTDI(vendorId, productId, { baudRate: 9600 });

ftdi.on('error', (err) => {
  console.log('Error', err);
});

ftdi.on('ready', async () => {
  const data = new Uint8Array(1);
  data.set([0x06]);

  ftdi.on('data', async (data) => {
    console.log('Data:', bytes2hex(data));
  });

  await ftdi.writeAsync(data);

  await ftdi.close();
});
```

Also see [test.js](./test.js) for details.
