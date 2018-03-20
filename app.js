const bittrex = require('node-bittrex-api');
//const pgp = require("pg-promise");
const mysql = require('promise-mysql');
const config = require('./config.json');
const key = require('./key.json');
const moment = require('moment');
const  pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'bittrex',
    connectionLimit: 10
});
var nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'lytranuit@gmail.com',
        pass: 'vohinhca'
    }
});

const mailOptions = {
    from: 'lytranuit@gmail.com',
    to: 'lytranuit@gmail.com',
    subject: 'Báo cáo giá bitrex',
};
//const postgres = pgp(config.pg_db);
//bittrex.options(key);
//bittrex.getmarketsummary({market: "BTC-LTC"}, function (data, err) {
//    if (err) {
//        return console.error(err);
//    }
//    console.log(data.result[0]);
//    bittrex.getmarkethistory({market: "BTC-LTC"}, function (ticker) {
//        console.log(ticker);
//    });
////    for (var i in data.result) {
////        bittrex.getticker({market: data.result[i].MarketName}, function (ticker) {
////            console.log(ticker);
////        });
////    }
//});
bittrex.options({
    verbose: true,
    websockets: {
        onConnect: function () {
            console.log('onConnect fired');
            const websocketsclient = bittrex.websockets.subscribe(['USDT-ZEC', 'USDT-BTC'], function (data) {
                if (data.M === 'updateExchangeState') {
                    data.A.forEach(function (data_for) {
                        console.log('Market Update for ' + data_for.MarketName);
                        data_for.Fills.forEach(function (fill) {
//                            console.log(fill);
                            fill.MarketName = data_for.MarketName;
                            var timestamp = moment().format('YYYY-MM-DD HH:mm:ss.SSS');
                            fill.TimeStamp = timestamp;
                            pool.query('INSERT INTO volumn SET ?', fill);
                        })
                    });
                }
            });
            bittrex.websockets.listen(function (data, client) {
                if (data.M === 'updateSummaryState') {
                    data.A.forEach(function (data_for) {
                        data_for.Deltas.forEach(function (marketsDelta) {
                            var timestamp = moment().format('YYYY-MM-DD HH:mm:ss.SSS');
                            marketsDelta.TimeStamp = timestamp;
                            pool.query('INSERT INTO market SET ?', marketsDelta);
                            console.log('Ticker Update for ' + marketsDelta.MarketName);
                        });
                    });
                }
            });
        },
    },
});
console.log('Connecting ....');
bittrex.websockets.client(function (client) {
    // connected - you can do any one-off connection events here
    //
    // Note: Reoccuring events like listen() and subscribe() should be done
    // in onConnect so that they are fired during a reconnection event.
    console.log('Connected');
});
//const timer = setInterval(async function () {
//    var rows = await pool.query("select * from market where marketname = 'USDT-ZEC' ORDER id DESC LIMIT 1");
//    var last_price = rows[0]['last'];
//    var rows = await pool.query("select max(last) as last from market where marketname = 'USDT-ZEC' AND `TIMESTAMP` > DATE_SUB(NOW(), INTERVAL 5 MINUTE)");
//    var max_price = rows[0]['last'];
//}, 60000);