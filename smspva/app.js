const request = require('request');
const path = require('path');
const fs = require('fs');

const options = {
method: 'GET',
url: 'https://api.smspva.com/activation/number/UA/opt9',
headers: {apikey: 'YOUR APIKEY'}
};

request(options, function (error, response, body) {
if (error) throw new Error(error);

const data = JSON.parse(body);
console.log(data);

const id = data.data.orderId;
const phoneNumber = data.data.phoneNumber;

const filePath = path.join(__dirname, 'phoneNumber.txt');
fs.appendFile(filePath, `Phone Number: ${phoneNumber}\n`, (err) => {
if (err) throw err;
console.log('Phone number saved to phoneNumber.txt');
});

const secondOptions = {
method: 'GET',
url: `https://api.smspva.com/activation/sms/${id}`,
headers: {apikey: 'YOUR APIKEY'}
};

const interval = setInterval(() => {
request(secondOptions, function (error, response, body) {
if (error) throw new Error(error);

const data = JSON.parse(body);
console.log(data);
if(data.statusCode == 400) {
  console.log(
  'THE ORDER IS FAILED.'
)
return}

if (data.statusCode == 202) {
console.log('still no code');
} 
else if (data.statusCode == 200) {

const smsCode = data.data.sms.code;
fs.appendFile(filePath, `SMS Code: ${smsCode}\n`, (err) => {
if (err) throw err;
console.log('The code has come and written to the file');
});
clearInterval(interval);
}
});
}, 1000 * 10);
});