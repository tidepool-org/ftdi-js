# FTDI.js

WIP

## Installation

WIP

## Usage

WIP

### Node.js / Electron

```js
const FTDI = require('./index.js');

const ftdi = new FTDI(6777, 24577, { baudRate: 9600 });

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
