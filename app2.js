const bittrex = require('node-bittrex-api');
//const pgp = require("pg-promise");
const mysql = require('promise-mysql');
const config = require('./config.json');
const key = require('./key.json');
const moment = require('moment');
const math = require('mathjs');
const technical = require('technicalindicators');

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
    subject: 'Báo cáo giá bitrex'
};
bittrex.options(key);
const markets = {
};
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
bittrex.getmarketsummaries(function (data, err) {

    if (err) {
        return console.error(err);
    }
    for (var i in data.result) {
        var row = data.result[i];
        if (row['MarketName'].indexOf("USDT") != -1) {
            markets[row['MarketName']] = {
                MarketName: row['MarketName'],
                last: row['Last'],
                chienluoc1: {

                },
                chienluoc2: {
                }
            };
        }
    }
//    cronCandleHour();
    cronCandle30Min();
//    cronCandle5Min();
});
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
                            markets[marketsDelta.MarketName].last = marketsDelta.Last;
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
function getCandleAllMarket(tickInterval) {
    for (var i in markets) {
        var market = i;
        getCandle(market, tickInterval);
    }
}
function getCandle(market, tickInterval) {
    try {
        bittrex.getcandles({
            marketName: market,
            tickInterval: tickInterval, // intervals are keywords
        }, function (data, err) {
            markets[market]['chienluoc1'].up2candle = false;
            markets[market]['chienluoc1'].down2candle = false;
            markets[market]['chienluoc1'].send1 = false;
            if (err) {
                return false;
            }
            if (data.success) {
                var results = data.result;
                results.forEach(function (result) {
                    var t = result['T'];
                    var timestamp = moment(t + "+00:00").format('YYYY-MM-DD HH:mm:ss.SSS');
                    result['T'] = timestamp;
                    result['marketName'] = market;
                    result['tickInterval'] = tickInterval;
//                    pool.query('INSERT INTO candle SET ?', result).catch(function () {
//                        return pool.query('UPDATE candle SET ? WHERE `marketName` = "' + result['marketName'] + '" and `tickInterval` = "' + result['tickInterval'] + '" and `T` = "' + result['T'] + '"', result);
//                    }).catch(function () {
//                        console.log("LOI GI DO");
//                        return;
//                    });
                });

//                console.log(results);

                if (tickInterval == "hour") {
                    var last = results[results.length - 1];
                    if (!last)
                        return false;
//                console.log(results);
//                    if (moment(last.T).valueOf() == moment().startOf("hour").valueOf()) {
//                        results.pop();
//                    }
                    /*
                     * RSI
                     */
//                    console.log(array);
                    var rsi = technical.RSI;
                    var arg = results.map(function (item) {
                        return item['C'];
                    });
                    var input = {
                        values: arg,
                        period: 14
                    };
                    var array_rsi = rsi.calculate(input);
                    markets[market].rsi = array_rsi[array_rsi.length - 1];

                    /*
                     * MFI
                     */
                    var mfi = technical.MFI;
                    var argh = results.map(function (item) {
                        return item['H'];
                    });
                    var argl = results.map(function (item) {
                        return item['L'];
                    });
                    var argv = results.map(function (item) {
                        return item['V'];
                    });
                    var argc = results.map(function (item) {
                        return item['C'];
                    });

                    var input = {
                        high: argh,
                        low: argl,
                        close: argc,
                        volume: argv,
                        period: 14
                    };
                    var array_mfi = mfi.calculate(input);
                    markets[market].mfi = array_mfi[array_mfi.length - 1];

                    /*
                     * BOLLINGER BAND 
                     */
                    var bb = technical.BollingerBands;
                    var arg = results.map(function (item) {
                        return item['C'];
                    });
                    var input = {
                        values: arg,
                        period: 20,
                        stdDev: 2
                    };
                    var array_bb = bb.calculate(input);
                    markets[market].bb = array_bb[array_bb.length - 1];

                    if (market == "USDT-BTC")
                        console.log(markets[market]);
                    /*
                     * CHECK 2 NEN CUOI CUNG
                     */
                    var array = results.slice(-2);

                    if (array.length == 2) {
                        var check_candle = checkCandle(array);
                        if (check_candle == "Up") {
                            markets[market]['chienluoc1'].up2candle = true;
                            markets[market]['chienluoc1'].willbuy = array[1].H;
                            markets[market]['chienluoc1'].take2per = array[1].H * 1.02 /// MOC 2%;
                            markets[market]['chienluoc1'].take5per = array[1].H * 1.05 /// MOC 5%;
                            markets[market]['chienluoc1'].take10per = array[1].H * 1.1 /// MOC 10%;

                            markets[market]['chienluoc1'].stop5per = array[1].C * 0.95 // MOC 5%;

                            if (['USDT-BTC'].indexOf(market) != -1) {
                                var html = "<p>[HOT]" + market + "</p><p>Current Price: " + markets[market].last + "</p><pre>" + JSON.stringify(array, undefined, 2) + "</pre>";
                                mailOptions['html'] = html;
                                transporter.sendMail(mailOptions, function (error, info) {
                                    if (error) {
                                        console.log(error);
                                    } else {
                                        console.log('Email sent: ' + info.response);
                                    }
                                });
                            }
                        } else if (check_candle == "Down") {
                            markets[market]['chienluoc1'].down2candle = true;
                        }
                    }
//                    console.log(markets[market]);
                }
            }
        });
    } catch (e) {

    }
}
function cronCandleHour() {
    var m = moment();
    var tickInterval = "hour";
    var roundUp = m.minute() || m.second() || m.millisecond() ? m.add(1, 'hour').startOf('hour') : m.startOf('hour');
    var duration = roundUp.diff(moment()) + 300000;
    getCandleAllMarket(tickInterval);
    console.log(roundUp);
    var timerhour = setTimeout(function () {
        getCandleAllMarket(tickInterval);
        timerhour = setInterval(function () {
            getCandleAllMarket(tickInterval);
        }, 3600000);
    }, duration);
}
function cronCandle30Min() {
    var m = moment();
    var tickInterval = "thirtyMin";
    var remainder = 30 - (m.minute() % 30);
    var roundUp = moment(m).add(remainder, "minutes");
    var duration = roundUp.diff(moment()) + 300000;
    console.log(roundUp);
    getCandleAllMarket(tickInterval);
    var timer30min = setTimeout(function () {
        getCandleAllMarket(tickInterval);
        timer30min = setInterval(function () {
            getCandleAllMarket(tickInterval);
        }, 1800000);
    }, duration);
}

function cronCandle5Min() {
    var m = moment();
    var tickInterval = "fiveMin";
    var remainder = 5 - (m.minute() % 5);
    var roundUp = moment(m).add(remainder, "minutes");
    var duration = roundUp.diff(moment()) + 60000;
    console.log(roundUp);
    getCandleAllMarket(tickInterval);
    var timer5min = setTimeout(function () {
        getCandleAllMarket(tickInterval);
        timer5min = setInterval(function () {
            getCandleAllMarket(tickInterval);
        }, 30000);
    }, duration);
}
function checkPrice(MarketName, price) {
    if (!markets[MarketName])
        return;
//    console.log(markets[MarketName]);
    if (markets["USDT-BTC"]['mfi'] < 20)
        return;
    chienluoc1(MarketName, price);
    chienluoc2(MarketName, price);
}
function chienluoc1(MarketName, price) {
    /*
     * MUA VÀO
     */
    if (markets[MarketName]['chienluoc1'].willbuy < price && markets[MarketName]['chienluoc1'].up2candle && !markets[MarketName]['chienluoc1'].buy && MarketName.indexOf("USDT") != -1) {
        markets[MarketName]['chienluoc1']['buy'] = true;
        var percent = (price - markets[MarketName]['chienluoc1'].willbuy) / markets[MarketName]['chienluoc1'].willbuy * 100;
        var html = "<p>" + MarketName + " đang tăng mạnh!</p><p>Current Price: " + price + "(" + percent + "%)</p><pre>" + JSON.stringify(markets[MarketName], undefined, 2) + "</pre>";
        mailOptions['html'] = html;
        transporter.sendMail(mailOptions, function (error, info) {
            if (error) {
                console.log(error);
            } else {
                console.log('Email sent: ' + info.response);
            }
        });
    }
    /*
     * CAT LO
     */
    if (markets[MarketName]['chienluoc1'].buy && price < markets[MarketName]['chienluoc1'].stop5per) {
        markets[MarketName]['chienluoc1']['buy'] = false;
        markets[MarketName]['chienluoc1']['up2candle'] = false;
        /*
         * INSERT DB
         */
        pool.query('INSERT INTO trade SET ?', {MarketName: MarketName, price_buy: markets[MarketName].willbuy, price_sell: price});
    }

    /*
     * BÁN LẠI
     */
    if (markets[MarketName]['chienluoc1'].buy && price < markets[MarketName].last && markets[MarketName]['chienluoc1']['targetdone']) {
        markets[MarketName]['buy'] = false;
        markets[MarketName]['up2candle'] = false;
        /*
         * INSERT DB
         */
        pool.query('INSERT INTO trade SET ?', {MarketName: MarketName, price_buy: markets[MarketName].willbuy, price_sell: price});
    }
    /*
     * KIEM TRA MUC TIEU
     */
    if (markets[MarketName]['chienluoc1'].buy && price > markets[MarketName]['chienluoc1'].take10per) {
        /*
         * INSERT DB
         */
        markets[MarketName]['targetdone'] = true;

    }
    if (markets[MarketName]['chienluoc1'].buy && price > markets[MarketName]['chienluoc1'].take5per) {
        /*
         * INSERT DB
         */
        markets[MarketName]['targetdone'] = true;
    }
    if (markets[MarketName]['chienluoc1'].buy && price > markets[MarketName]['chienluoc1'].take2per) {
        /*
         * INSERT DB
         */
        markets[MarketName]['targetdone'] = true;
    }
}
function chienluoc2(MarketName, price) {
    /*
     * MUA VÀO
     */
    if (!markets[MarketName]['chienluoc2'].notbyinsession && markets[MarketName]['chienluoc2'].countbuy && markets[MarketName]['rsi'] < 30 && markets[MarketName].lower > price) {
        markets[MarketName]['chienluoc2'].countbuy--;
        markets[MarketName]['chienluoc2'].notbyinsession = true;
        markets[MarketName]['chienluoc2']['buy'] = true;
    }


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