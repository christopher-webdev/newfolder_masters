
const Interval = {
    Monthly: "month",
    Yearly: "year",
    Unlimited: "unlimited"
}

const Package = {
    Free: {
        name: 'Free',
        amount: 0, // 0 Dollars
        interval: Interval.Unlimited
    },
    BasicMonthly: {
        name: 'Basic Monthly',
        amount: 0, 
        interval: Interval.Monthly
    },
    BasicYearly: {
        name: 'Basic Yearly',
        amount: 0, 
        interval: Interval.Monthly
    },
    CreatorMonthly: {
        name: 'Creator Monthly',
        amount: 0, 
        interval: Interval.Monthly
    },
    CreatorYearly: {
        name: 'Creator Yearly',
        amount: 0,
        interval: Interval.Monthly
    },
    PremiumMonthly: {
        name: 'Premium Monthly',
        amount: 0, 
        interval: Interval.Monthly
    },
    PremiumYearly: {
        name: 'Premium Yearly',
        amount: 0, 
        interval: Interval.Monthly
    },
};

const allowedPackages = [
    Package.Free,
    Package.BasicMonthly,
    Package.CreatorMonthly,
    Package.PremiumMonthly,
    Package.BasicYearly,
    Package.CreatorYearly,
    Package.PremiumYearly,
];

const allowedIntervals = [
    Interval.Monthly,
    Interval.Yearly,
    Interval.Unlimited
]

module.exports = {
    Package,
    Interval,
    allowedPackages,
    allowedIntervals
}
