const axios = require("axios");
const getEnv = require("../config/env");


const SANDBOX_URL = "https://api-m.sandbox.paypal.com/v1"; //"https://api.playground.klarna.com/"
// let USERNAME="rofesol.ng@gmail.com"
// let PASSWORD='Femi@real0071234'

CALLBACK_URL = 'http://localhost:5000/api/billings/klarna/callback'

// /payments/v1/sessions
// Create axios instance
const axiosClient = axios.create({
    baseURL: SANDBOX_URL,
});


module.exports.InitPayload = function (amount, order){ 
    const reference = `sacgisc87sa_${Math.random().toString().replace(".","_")}`
    return {
    acquiring_channel: "ECOMMERCE",
    intent: "buy_and_tokenize",
    purchase_country: "SE",
    purchase_currency: "SEK",
    locale: "en-SE",
    order_amount: 9999,
    // order_tax_amount: 2000,
    order_lines: [
      {
        type: "digital", 
        subscription: { 
          name: order.name, //"Premium Monthly {{1234834}}", 
          interval: order.interval, //"MONTH",
          interval_count: 1
        },
        reference: reference, //"19-402", 
        name: order.name, //"Streaming Service Monthly - Free Trial", 
        quantity: 1, 
        unit_price: amount,
        // tax_rate: 2500, 
        total_amount: amount, 
        // total_discount_amount: 0, 
        // total_tax_amount: 2000 
      }
    ], 
    merchant_urls: {
      authorization: CALLBACK_URL
    }
    }
  }  

// Define the authenticate function
const authenticate = async () => {
    console.log("Geting access token...");
    const base64 = Buffer.from(`${getEnv("PAYPAL_CLIENT_ID")}:${getEnv("PAYPAL_SECRET")}`).toString('base64');

    const payload = {
        grant_type: "client_credentials",
    }
    const response = await axios.post(`${SANDBOX_URL}/oauth2/token`, payload, {
        headers: {
            "Authorization": `Basic ${base64}`,
            "Content-Type": "application/x-www-form-urlencoded",
            "Accept": "application/json",
            "Accept": "application/json",
            "PayPal-Request-Id": "PLAN-18062019-001",
            "Prefer": "return=representation"
        }
    });
    return response.data
};

// Add a request interceptor
axiosClient.interceptors.request.use(async function (config) {
    // Do something before request is sent
    const auth = await authenticate();
    config.headers.Authorization = `Bearer ${auth.access_token}`;
    return config;
}, function (error) {
    // Do something with request error
    return Promise.reject(error);
});


const Request = async (url, method = "GET", data = undefined) => {
    try {
        const response = await axiosClient.request({
            method,
            url,
            data,
        })

        return response.data
    } catch (error) {
        if (error.response) {
            // Server responded with a status other than 2xx
            console.error('Response error:', error.response.data);
            console.error('Status:', error.response.status);
        } else if (error.request) {
            // Request was made but no response was received
            console.error('No response received:', error.message);
        } else {
            // Something else happened while setting up the request
            console.error('Error setting up request:', error.message);
        }
    }
}


module.exports.Request = Request