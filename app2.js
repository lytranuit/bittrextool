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
bittrex.options(key);
const markets = [{
        MarketName: "USDT-BTC"
    }, {
        MarketName: "USDT-ZEC"
    }, {
        MarketName: "USDT-LTC"
    },
];
//const goodNews = {
//    candle1hour: false,
//    candle2hour: false,
//    candle1thirymin: false,
//    candle2thirymin: false
//}
//const badNews = {
//    candle1hour: false,
//    candle2hour: false,
//    candle1thirymin: false,
//    candle2thirymin: false
//}
cronCandleHour();
cronCandle30Min();
//bittrex.getmarketsummary({market: "BTC-LTC"}, function (data, err) {
//
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

//                            { OrderType: 'SELL',
//                                    Rate: 8581.0000001,
//                                    Quantity: 0.00700967,
//                                    TimeStamp: '2018-03-20T03:54:46.42' }
//            bittrex.websockets.subscribe(['USDT-ZEC', 'USDT-BTC'], function (data) {
//                if (data.M === 'updateExchangeState') {
//                    data.A.forEach(function (data_for) {
//                        console.log('Market Update for ' + data_for.MarketName);
//                        data_for.Fills.forEach(function (fill) {
////                            console.log(fill);
//                            fill.MarketName = data_for.MarketName;
//                            var timestamp = moment().format('YYYY-MM-DD HH:mm:ss.SSS');
//                            fill.TimeStamp = timestamp;
//                            pool.query('INSERT INTO volumn SET ?', fill);
//                        })
//                    });
//                }
//            });

//                { MarketName: 'USDT-XRP',
//                        High: 0.724,
//                        Low: 0.62765114,
//                        Volume: 6219240.84456133,
//                        Last: 0.7021024,
//                        BaseVolume: 4186587.26447341,
//                        TimeStamp: '2018-03-20T03:54:49.167',
//                        Bid: 0.7021024,
//                        Ask: 0.70279992,
//                        OpenBuyOrders: 787,
//                        OpenSellOrders: 2916,
//                        PrevDay: 0.645,
//                        Created: '2017-07-14T17:10:10.737' }
            bittrex.websockets.listen(function (data, client) {
                if (data.M === 'updateSummaryState') {
                    data.A.forEach(function (data_for) {
                        data_for.Deltas.forEach(function (marketsDelta) {
                            var timestamp = moment().format('YYYY-MM-DD HH:mm:ss.SSS');
                            marketsDelta.TimeStamp = timestamp;
//                            pool.query('INSERT INTO market SET ?', marketsDelta);

                            checkPrice(marketsDelta.MarketName, marketsDelta.Last);
//                            console.log(marketsDelta);
//                            console.log('Ticker Update for ' + marketsDelta.MarketName);
                        });
                    }
                    );
                }
            });
        }
    }
});
console.log('Connecting ....');
bittrex.websockets.client(function (client) {
//    connected - you can do any one - off connection events here

// Note: Reoccuring events like listen() and subscribe() should be done
// in onConnect so that they are fired during a reconnection event.
    console.log('Connected');
});



//    { O: 8610.0000001,
//  H: 8645.09076831,
//  L: 8551.00000003,
//  C: 8575.94163613,
//  V: 128.33211765,
//  T: '2018-03-20T04:00:00',
//  BV: 1103543.7812201 }

function getCandle(tickInterval) {
    markets.forEach(function (market) {
        var market = market.MarketName;
        bittrex.getcandles({
            marketName: market,
            tickInterval: tickInterval, // intervals are keywords
        }, function (data, err) {
            if (data.success) {
                var results = data.result;
                results.forEach(function (result) {
                    var t = result['T'];
                    var timestamp = moment(t + "+00:00").format('YYYY-MM-DD HH:mm:ss.SSS');
                    result['T'] = timestamp;
                    result['marketName'] = market;
                    result['tickInterval'] = tickInterval;
                    pool.query('INSERT INTO candle SET ?', result).catch(function () {
                        return pool.query('UPDATE candle SET ? WHERE `marketName` = "' + result['marketName'] + '" and `tickInterval` = "' + result['tickInterval'] + '" and `T` = "' + result['T'] + '"', result);
                    }).catch(function () {
                        console.log("LOI GI DO");
                        return;
                    });
                });
                if (tickInterval == "hour") {
                    var last = results[results.length - 1];
                    if (moment(last.T).valueOf() == moment().startOf("hour").valueOf()) {
                        var array = results.slice(-3);
                        array.pop();
                    } else {
                        var array = results.slice(-2);
                    }
                    if (array.length == 2) {
                        var check_candle = checkCandle(array);
                        if (check_candle == "Up") {
                            mailOptions['text'] = market + " đã tăng 2 lần liên tiếp";
                            transporter.sendMail(mailOptions, function (error, info) {
                                if (error) {
                                    console.log(error);
                                } else {
                                    console.log('Email sent: ' + info.response);
                                }
                            });
                        } else if (check_candle == "Down") {

                        }

                    }
                }
            }
        });
    });
}
function cronCandleHour() {
    var m = moment();
    var tickInterval = "hour";
    var roundUp = m.minute() || m.second() || m.millisecond() ? m.add(1, 'hour').startOf('hour') : m.startOf('hour');
    var duration = roundUp.diff(moment());
    getCandle(tickInterval);
    console.log(roundUp);
    var timerhour = setTimeout(function () {
        getCandle(tickInterval);
        timerhour = setInterval(function () {
            getCandle(tickInterval);
        }, 3600000);
    }, duration);
}
function cronCandle30Min() {
    var m = moment();
    var tickInterval = "thirtyMin";
    var remainder = 30 - (m.minute() % 30);
    var roundUp = moment(m).add(remainder, "minutes");
    var duration = roundUp.diff(moment());
    console.log(roundUp);
    getCandle(tickInterval);
    var timer30min = setTimeout(function () {
        getCandle(tickInterval);
        timer30min = setInterval(function () {
            getCandle(tickInterval);
        }, 1800000);
    }, duration);

}
function checkPrice(MarketName, price) {

}
function checkCandle(candles) {
    var candle1 = candles[0];
    var candle2 = candles[1];
    var result = "";
    if (candle1.V <= candle2.V) {
        if (candle1.O < candle1.C && candle2.O < candle2.C) {
            result = "Up";
        }
        if (candle1.O > candle1.C && candle2.O > candle2.C) {
            result = "Down";
        }
    }

    return result;
}