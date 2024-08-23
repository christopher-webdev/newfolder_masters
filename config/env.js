require("dotenv").config()

const envVars = {
    ENV: process.env.NODE_ENV,
    APP_NAME: process.env.APP_NAME,
    APP_URL: process.env.APP_URL,
    
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
    STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
    
    PAYPAL_CLIENT_ID: process.env.PAYPAL_CLIENT_ID,
    PAYPAL_SECRET: process.env.PAYPAL_SECRET,
    
    "STRIPE_REDIRECT_URL"(){
        return `${this.APP_URL}/plans-billing.html?provider=stripe&action=retrieve_payment`
    },
    "WEBHOOK.PAYPAL"(){
        return {
            url: `${this.APP_URL}/api/billings/webhooks/paypal.webhooks`,
            event_types: [
                { name: 'BILLING.SUBSCRIPTION.CREATED' },
                { name: 'BILLING.SUBSCRIPTION.ACTIVATED' },
                { name: 'BILLING.SUBSCRIPTION.CANCELLED' },
            ],
        } 
    },  
    
    "WEBHOOK.STRIPE"(){
     return {
        url: `${this.APP_URL}/api/billings/webhooks/paypal.webhooks`,
        event_types: [
            { name: 'BILLING.SUBSCRIPTION.CREATED' },
            { name: 'BILLING.SUBSCRIPTION.ACTIVATED' },
            { name: 'BILLING.SUBSCRIPTION.CANCELLED' },
        ],
     } 
    },
    get(v){
        return this[v]
    }
}

function getEnv(variable){
    const _env = process.env.NODE_ENV === 'development' ? `DEV_${variable}` : variable

    const vars = Object.keys(envVars)

    if(vars.includes(_env)){
        return typeof envVars[_env] == "function" ?  envVars[_env]() :  envVars[_env]
    }else if(vars.includes(variable)){
        return typeof envVars[variable] == "function" ?  envVars[variable]() :  envVars[variable]
    }

    throw new Error(`No such variable: `, _env, " | ", variable)
}


module.exports = getEnv