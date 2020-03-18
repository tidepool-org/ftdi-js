const FTDI = require('./index.js');


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
  const ftdi = new FTDI(6777, 24577, {baudRate: 9600});

  ftdi.on('ready', async () => {
    const data = new Uint8Array(1);
    data.set([0x06]);

    ftdi.on('data', async (data) => {
      console.log('Data:', bytes2hex(data));
      await ftdi.writeAsync(data);
    });


    await ftdi.writeAsync(data);
    // let result = await ftdi.read();
    // console.log('Bytes read:', result.bytesRead);
    // console.log('Data:', bytes2hex(result.uint8buffer));
    //
    // result = await ftdi.read();
    // console.log('Bytes read:', result.bytesRead);
    // console.log('Data:', bytes2hex(result.uint8buffer));
    // await ftdi.write(data);
    // result = await ftdi.read();
    // console.log('Bytes read:', result.bytesRead);
    // console.log('Data:', bytes2hex(result.uint8buffer));

    console.log('Press any key to continue');
    await keypress();

    await ftdi.close();
  });

})().catch((error) => {
  console.log('Error: ', error);
});
