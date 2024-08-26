
const request = require('request');
const fs = require('fs');
const path = require('path');
const os = require('os');

const base_url = 'URL';
const APIKEY = 'KEY';


const options = {
  method: 'GET',
  url: `${base_url}/number/PY/opt15`, 
  headers: { 'apikey': APIKEY } 
};

request(options, (error, response, body) => {
  if (error) throw new Error(error);
  if (response.statusCode !== 200) {
      throw new Error(`Error fetching phone number: ${response.statusMessage}`);
  }

  const data = JSON.parse(body);
  console.log(data);

  const phoneNumber = data.data.phoneNumber;
  const orderId = data.data.orderId;

  // Extract the last 4 digits of the phone number
  const lastFourDigits = phoneNumber.slice(-4);

  // Step 2: Save the full phone number and the last 4 digits to a file on Desktop
  const desktopPath = path.join(os.homedir(), 'Desktop');
  const filePath = path.join(desktopPath, 'phoneNumber.txt');

  // Append the phone number details to the file
  fs.appendFileSync(filePath, `${phoneNumber}:${lastFourDigits}\n`);
  console.log('Phone number saved to phoneNumber.txt');

  // Step 3: Poll for SMS Code
  const secondOptions = {
      method: 'GET',
      url: `${base_url}/sms/${orderId}`,
      headers: { 'apikey': APIKEY }
  };

  const pinFilePath = path.join(desktopPath, 'PIN.txt');  // Path for the PIN file

  // Set a timeout for checking the SMS (10 minutes = 600 seconds)
  const timeoutDuration = 600000; // 10 minutes in milliseconds
  const startTime = Date.now(); // Start time for polling

  const pollForSMS = async () => {
      while (Date.now() - startTime < timeoutDuration) {
          const remainingTime = timeoutDuration - (Date.now() - startTime);
          if (remainingTime <= 0) {
              console.log("Timeout reached. No SMS received.");
              break;
          }

          try {
              const response = await new Promise((resolve, reject) => {
                  request(secondOptions, (error, response, body) => {
                      if (error) return reject(error);
                      resolve({ response, body });
                  });
              });

              // if (response.response.statusCode !== 200) {
              //     throw new Error(`Error fetching SMS code: ${response.response.statusMessage}`);
              // }

              const data = JSON.parse(response.body);
              console.log(data);

              const statusCode = data.statusCode;
              if (statusCode === 400) {
                  console.log('THE ORDER HAS FAILED.');
                  break;
              } else if (statusCode === 202) {
                  console.log('Still no code, waiting for the SMS...');
              } else if (statusCode === 200) {
                  // Check if there's a code in the response
                  if (data.data && data.data.sms && data.data.sms.code) {
                      const smsCode = data.data.sms.code;

                      // Write the SMS code to the PIN file
                      fs.appendFileSync(pinFilePath, `${smsCode}\n`);
                      console.log(`The code ${smsCode} has been received and added to the PIN.txt file.`);
                      break;
                  }
              }
          } catch (error) {
              console.error(error.message);
          }

          // Wait for 10 seconds before the next request
          await new Promise(resolve => setTimeout(resolve, 10000));
      }
  };

  pollForSMS();
});