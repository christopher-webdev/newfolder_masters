const STRIPE_PUBLIC_KEY =
    'pk_test_51DKSt8AW156duCe7SQPEiEgCvN7VOTUIvpkyfqNdMo72W8v4pFDZmuLxMs69clBbDXMHPL5SKAdodlXO0Mxx71HN00Yzx63HKt';
const PAYPAL_CLIENT_ID =
    'AfF6JpcY-Fr8z-f27osmui4h1c0g2CSdUOo_mMGzVXExwApV-mNg-zH6VCKLK3U84KimA3j2pR7TyLLA';

let stripe, elementsLoaded = false;

const PROVIDERS = {
    stripe: 'https://js.stripe.com/v3/',
    klarna: 'https://x.klarnacdn.net/kp/lib/v1/api.js',
    paypal: `https://www.paypal.com/sdk/js?client-id=${PAYPAL_CLIENT_ID}&components=buttons&vault=true&intent=subscription`,
};

window.addEventListener('DOMContentLoaded', async () => {
    await loadScript(PROVIDERS.stripe);
    // await loadScript(PROVIDERS.klarna, true)
    await loadScript(PROVIDERS.paypal);

    stripe = Stripe(STRIPE_PUBLIC_KEY, {
        apiVersion: '2020-08-27',
    });
    const url = new URL(window.location).searchParams;

    if (url.has('payment_intent_client_secret')) {
        window.history.replaceState(
            'plans-billing.html',
            undefined,
            '/plans-billing.html'
        );
        const clientSecret = url.get('payment_intent_client_secret');

        const { error, paymentIntent } = await stripe.retrievePaymentIntent(
            clientSecret
        );
        if (error) {
            initModal({
                title: `Payment ${paymentIntent.status}`,
                content:
                    '<br />Your payment is not successful. <a href="/my-account.html">Try again</a>',
            });
            return;
        }

        console.log(
            '🚀 ~ window.addEventListener ~ paymentIntent:',
            paymentIntent
        );
        fetch(`/api/billings/pay-with?provide=stripe.confirm-subscription`, {
            method: 'POST',
            body: JSON.stringify({ paymentIntentId: paymentIntent.id }),
            headers: {
                'Content-Type': 'application/json',
            },
        })
            .then((res) => res.json())
            .then(({ data }) => {
                console.log('🚀 ~ onApprove ~ data:', data);
                initModal({
                    title: `Payment ${paymentIntent.status}`,
                    content:
                        '<br />Your payment is successful. <a href="/manage-subscription.html">Manage Subscription</a>',
                });
                setTimeout(() => {
                    window.location.href = '/manage-subscription.html';
                }, 1500);
            });
    }
});

function cancelSubscription(subscriptionId) {
    fetch('/api/billings/pay-with?provider=stripe.cancel-subscription', {
        body: JSON.stringify({ subscriptionId }),
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
    })
        .then((res) => res.json())
        .then((result) => {
            initModal({
                title: 'Cancel Subscription',
                content: result.success
                    ? 'You subscription has been canceled'
                    : 'Your ubscription has not been canceled',
            });
        })
        .catch((error) => {
            initModal({
                title: 'Cancel Subscription',
                content:
                    'Your subscription has not been canceled. Please try again',
            });
        });
}

async function handlePayment(packageId) {
    // <button id="payWithKlarnaBtn">Pay with Klarna</button>
    initModal({
        title: 'Select Payment Method',
        content: `
        <div class="paywith-btn">
        <button id="payWithStripeBtn">Pay with Stripe</button>
        <button id="payWithPaypalBtn">Pay with Paypal</button>
        </div>
`,
    });
    document
        .getElementById('payWithStripeBtn')
        .addEventListener(
            'click',
            async ()=> await initStripePaymentModal(packageId) 
        );
    //   document.getElementById('payWithKlarnaBtn').addEventListener('click', async () => await initKlarnaPaymentModal(packageId));
    document
        .getElementById('payWithPaypalBtn')
        .addEventListener(
            'click',
            async () => await initStripePaypalModal(packageId)
        );
}

function initStripePayment(packageId) {
    return new Promise(async (resolve, reject) => {
        const form = document.getElementById('payment-form');

        const response = await fetch(
            '/api/billings/pay-with?provide=stripe.create-payment-subscription',
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ packageId }),
            }
        ).then((res) => res.json());
        const { clientSecret, redirectUrl, customer } = await response.data;

        const elements = stripe.elements({
            clientSecret,
            loader: 'auto',
            // appearance: {/*...*/},
        });
        const cardElement = elements.create('payment', {
            paymentMethodOrder: ['apple_pay', 'google_pay', 'klarna', 'card'],
            // wallets: {
            //     applePay: "auto",
            //     googlePay: "auto"
            // }
        });
        cardElement.mount('#payment-element');

    const el = elements.getElement('payment')
    if(el){
        console.log("mounted");
        console.log(el);
        elementsLoaded = true
        
    }else{
        console.log('loading');
    }



        form.addEventListener('submit', async function (event) {
            event.preventDefault();
            setMessage('');

            try {
                const { error, paymentIntent } = await stripe.confirmPayment({
                    elements,
                    billing_details: {
                        name: customer.fullName,
                    },
                    // redirect: 'if_required'
                    confirmParams: {
                        return_url: redirectUrl,
                    },
                });
                if (error) {
                    reject(error);
                }
                resolve(paymentIntent);
            } catch (error) {
                reject(error);
            }
        });
    });
}

function loadScript(url, async = false) {
    return new Promise((resolve, reject) => {
        try {
            // <script src="https://x.klarnacdn.net/kp/lib/v1/api.js" async></script>
            // const url = url; //'https://js.stripe.com/v3/';
            const script = document.createElement('script');
            script.src = url;
            if (async) script.async = true;
            script.className = 'stript-cdn';

            // Event listener for script load
            script.onload = () => {
                console.log('Stripe checkout script loaded successfully');
                resolve(() => script.remove());
            };

            // Event listener for script error
            script.onerror = () => {
                console.log('Error loading Stripe checkout script');
                reject(new Error('Stripe checkout script load failed'));
            };

            document.head.append(script);
        } catch (error) {
            console.log('Error creating Stripe checkout script');
            reject(error);
        }
    });
}

function setMessage(msg) {
    document.querySelector('#payment-result').innerText = msg;
}

function initModal({ title = 'Modal Title', content = 'Modal Content' }) {
    if (document.querySelector(`#modal-modal`)) {
        document.querySelector(`#modal-modal`).remove();
    }
    const modal = document.createElement('div');
    const modalContent = document.createElement('div');
    const closeButton = document.createElement('span');
    const container = document.createElement('div');
    const modalTitle = document.createElement('h2');

    window.addEventListener('click', (event) => {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    });

    modal.id = 'modal-modal';
    modal.className = 'modal';
    modalContent.className = 'modal-content';
    closeButton.className = 'close-button';
    container.innerHTML = content;

    modalTitle.innerText = title;
    modalContent.appendChild(closeButton);
    modalContent.appendChild(modalTitle);
    modalContent.appendChild(container);
    modal.appendChild(modalContent);
    modal.style.display = 'block';
    document.body.appendChild(modal);
}

async function initStripePaymentModal(packageId) {
    let interval;
    initModal({
        title: 'Pay with Stripe',
        content: `
        <form id="payment-form">
            <div id="link-authentication-element"></div>
            <div id="payment-element">Please wait. Payment  modal is loading...</div>
            <button type="submit" id="ssss" class="hidden">Continue</button>
            <div id="payment-result"></div>
        </form>`,
    });
    interval = setInterval(() => {
        if(elementsLoaded){
            document.querySelector("#ssss").classList.remove("hidden")
            clearInterval(interval)
        }
    }, 1000);

    try {
        const paymentIntent = await initStripePayment(packageId);

        if (paymentIntent.status === 'succeeded') {
            setMessage('Payment succeeded!');
            return;
        }
        setMessage("Something isn't right. Please try again");
    } catch (error) {
        console.log('🚀 ~ loadScript ~ error:', error);
        setMessage(`Payment failed: ${error.message}`);
    }
}

async function initKlarnaPaymentModal(packageId) {
    initModal({
        title: 'Pay with Stripe',
        content: `
       <div id="klarna-payments-container"></div>
       `,
    });

    window.klarnaAsyncCallback = async function () {
        const session = await fetch(
            '/api/billings/pay-with?provide=klarna.create-payment-session'
        ).then((res) => res.json());
        console.log('🚀 ~ initKlarnaPaymentModal ~ session:', session);

        // This is where you start calling Klarna's JS SDK functions
        //
        Klarna.Payments.init({
            client_token:
                'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJmb28iOiJiYXIifQ.dtxWM6MIcgoeMgH87tGvsNDY6cH',
        });
        Klarna.Payments.load(
            {
                container: '#klarna-payments-container',
            },
            {},
            function (res) {
                console.debug(res);
            }
        );
    };
    klarnaAsyncCallback();
}
async function initStripePaypalModal(packageId) {
    initModal({
        title: 'Pay with Paypal',
        content: `
       <div id="paypal-button-container">Please wait. Payment modal is loading....</div>
       `,
    });

    const response = await fetch(
        `/api/billings/pay-with?provide=paypal.create-plan`,
        {
            method: 'POST',
            body: JSON.stringify({ packageId }),
            headers: {
                'Content-Type': 'application/json',
            },
        }
    );

    const { planId, productId } = (await response.json()).data;
    console.log('🚀 ~ initStripePaypalModal ~ planId:', planId);

    document.querySelector("#paypal-button-container").innerText = ""
    paypal
        .Buttons({
            async createSubscription(data, actions) {
                const createSubscription = () => new Promise((resolve, reject) => {
                    const createSub = actions.subscription.create({
                        plan_id: planId,
                    });
                    console.log("🚀 ~ createSubscription ~ createSub: Promise", createSub)
                    resolve(createSub);
                });

                const subscriptionId = await createSubscription()
                console.log("🚀 ~ createSubscription ~ subscriptionId: after promise", subscriptionId)
                
                const response = await fetch(
                    `/api/billings/pay-with?provide=paypal.create-subscription`,
                    {
                        method: 'POST',
                        body: JSON.stringify({
                            packageId,
                            planId,
                            productId,
                            subscriptionId,
                        }),
                        headers: {
                            'Content-Type': 'application/json',
                        },
                    }
                );

                const creaeSubscriptionResponse = (await response.json()).data;
                console.log(
                    '🚀 ~ createSubscription ~ subscription:',
                    creaeSubscriptionResponse
                );
                return subscriptionId;
            },

            onApprove(data) {
                console.log('🚀 ~ onApprove ~ data:', data);

                // if(data.status === 'APPROVAL_PENDING'){
                //     const approveUrl = data.links.find(link=>link.rel=='approve')
                //     console.log("🚀 ~ onApprove ~ approveUrl:", approveUrl)
                //     initModal({
                //         title: `Subscription is ${data.status?.split("_").reverse().join(" ").toLowerCase()}`,
                //         content: `<p>Please <a href="${approveUrl.href}">approve subscription</p>`,
                //     });
                // }else{
                fetch(
                    `/api/billings/pay-with?provide=paypal.confirm-subscription`,
                    {
                        method: 'POST',
                        body: JSON.stringify({
                            packageId,
                            subscriptionId: data.subscriptionID,
                            orderId: data.orderId,
                        }),
                        headers: {
                            'Content-Type': 'application/json',
                        },
                    }
                )
                    .then((res) => res.json())
                    .then(({ data }) => {
                        console.log('🚀 ~ onApprove ~ data:', data);
                        initModal({
                            title: 'Success',
                            content: `<p>Your subscription is successful</p>`,
                        });
                    });
                // }
            },

            onCancel(data) {
                initModal({
                    title: 'Canceled',
                    content: `<p>Your subscription was canceled. Please give another shoot</p>`,
                });
            },

            onError(err) {
                initModal({
                    title: 'Error',
                    content: `<p>Something terrible happened. Please give another shoot</p>`,
                });
            },
        })
        .render('#paypal-button-container');
}

/**
 * {
  "id": "pi_3PnvfpAW156duCe73fMUrjtX",
  "object": "payment_intent",
  "allowed_source_types": [
    "card",
    "klarna",
    "link",
    "cashapp"
  ],
  "amount": 1000,
  "amount_details": {
    "tip": {}
  },
  "automatic_payment_methods": {
    "allow_redirects": "always",
    "enabled": true
  },
  "canceled_at": null,
  "cancellation_reason": null,
  "capture_method": "automatic_async",
  "client_secret": "pi_3PnvfpAW156duCe73fMUrjtX_secret_ELCeYi2SiwZINzaytXWfMAuoD",
  "confirmation_method": "automatic",
  "created": 1723697553,
  "currency": "usd",
  "description": null,
  "last_payment_error": null,
  "livemode": false,
  "next_action": null,
  "next_source_action": null,
  "payment_method": "pm_1PnvfpAW156duCe72V6AjoxT",
  "payment_method_configuration_details": {
    "id": "pmc_1PPIW0AW156duCe7BkdaqNUw",
    "parent": null
  },
  "payment_method_types": [
    "card",
    "klarna",
    "link",
    "cashapp"
  ],
  "processing": null,
  "receipt_email": null,
  "setup_future_usage": null,
  "shipping": null,
  "source": null,
  "status": "succeeded"
}
 */
