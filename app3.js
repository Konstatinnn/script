const request = require('request');
const fs = require('fs');
const path = require('path');
const os = require('os');
const readline = require('readline');


const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});


const desktopPath = path.join(os.homedir(), 'Desktop');
const filePath = path.join(desktopPath, 'phoneNumber.txt');
const pinFilePath = path.join(desktopPath, 'PIN.txt'); 

const base_url = 'https://api.smspva.com';
const APIKEY = '';
const country = "";
const app = "";

const timeoutDuration = 600000;
const startTime = Date.now(); 
let currentNumber = null;
let currentId = null;


const customOptions = (url, method = 'GET') => ({ 
    method: method,
    url: `${base_url}/${url}`,
    headers: { 'apikey': APIKEY }

})

const deleteSms = async (id) => {
    request(customOptions(`activation/clearsms/${id}`, 'PUT'), function (error, response, body) {
        if (error) throw new Error(error);
      });
}


const getNumber = () => {
  request(customOptions(`activation/number/${country}/${app}`), (error, response, body) => {

    if (error) throw new Error(error);
    if (response.statusCode !== 200) {
        throw new Error(`Error fetching phone number: ${response.statusMessage}`);
    }

    const resp = JSON.parse(body);
    currentNumber = resp.data.phoneNumber;
    const orderId = resp.data.orderId;
    currentId = orderId;


    const lastFourDigits = currentNumber.slice(-4);
    fs.appendFileSync(filePath, `${currentNumber}:${lastFourDigits}\n`);
    console.log('Phone number saved to phoneNumber.txt');
    getSms(currentId)

})
}
getNumber();

async function getSms(orderId = null, secondRequest = false) {
    let id = orderId;
   


    while (Date.now() - startTime < timeoutDuration) {
        
    const remainingTime = timeoutDuration - (Date.now() - startTime);

        if (remainingTime <= 0) {
            console.log("Timeout reached. No SMS received.");
            break;
        }
        try {
            const response = await new Promise((resolve, reject) => {
                request(customOptions(`activation/sms/${id}`), (error, response, body) => {
                    
                    if (error) return reject(error);
                    resolve({ response, body });
            })
        })
        
        const resp = JSON.parse(response.body)
        const statusCode = resp.statusCode;
        

        if (statusCode === 400 || statusCode === 405) {
            console.log('THE ORDER HAS FAILED.');
            console.log('The program is finished '); 
            break;
        }

        else if (statusCode === 202) {
            console.log('Still no code, waiting for the SMS...');
        }

        else if (statusCode === 200) {
                const smsCode = resp.data.sms.code;
                if(secondRequest){
                    fs.appendFileSync(pinFilePath, `:${smsCode}\n`)
                }
                else {fs.appendFileSync(pinFilePath, `${smsCode}`);}
                console.log(`The code ${smsCode} has been received and added to the PIN.txt file.`);  
                await deleteSms(currentId);
                rl.question('Do you need a new code? YES: 1, NO: 0 ', (answer) => {
                    if(Boolean(+answer)) 
                        setTimeout(() => {getSms(currentId, true)}, 10 * 1000); 
                        
              
                    if(!Boolean(+answer)) console.log('the program is finished ');                                  
                });    
                break; 
        }

    }
    catch (error) {
        console.error(error.message);
    }

    await new Promise(resolve => setTimeout(resolve, 10000));
    
}

}




