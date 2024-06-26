import FTDI from './index.js';
import { webusb } from 'usb';

const bytes2hex = (bytes, noGaps) => {
  var message = '';
  for(var i in bytes) {
    var hex = bytes[i].toString(16).toUpperCase();
    if(hex.length === 1) {
      message += '0';
    }
    message += hex;
    if(!noGaps) {
      message += ' ';
    }
  }
  return message;
};

const keypress = async () => {
  process.stdin.setRawMode(true)
  return new Promise(resolve => process.stdin.once('data', () => {
    process.stdin.setRawMode(false)
    resolve()
  }))
}

(async () => {
  const device = await webusb.requestDevice({
    filters: [
      {
        vendorId: 6777,
        productId: 24577,
      },
    ],
  });

  const ftdi = new FTDI(device, {baudRate: 9600});

  ftdi.addEventListener('ready', async () => {
    const data = new Uint8Array(1);
    data.set([0x06]);

    ftdi.addEventListener('data', async (data) => {
      console.log('Data:', bytes2hex(data));
      await ftdi.writeAsync(data);
    });

    await ftdi.writeAsync(data);

    console.log('Press any key to continue');
    await keypress();

    await ftdi.closeAsync();
  });

})().catch((error) => {
  console.log('Error: ', error);
});
